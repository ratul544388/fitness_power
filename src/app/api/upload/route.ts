import { NextRequest } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { requireActor, ApiError } from "@/lib/permissions";
import { sameOrigin, success, failure } from "@/lib/http";
export const runtime="nodejs";
export async function POST(req:NextRequest) {
  try {
    sameOrigin(req);await requireActor("members");
    if(!process.env.CLOUDINARY_CLOUD_NAME||!process.env.CLOUDINARY_API_KEY||!process.env.CLOUDINARY_API_SECRET)throw new ApiError(503,"Cloudinary credentials have not been configured.");
    const form=await req.formData();const file=form.get("file");
    if(!(file instanceof File))throw new ApiError(422,"Choose an image to upload.");
    if(file.size>5*1024*1024)throw new ApiError(422,"Images must be smaller than 5 MB.");
    if(!["image/png","image/jpeg","image/webp"].includes(file.type))throw new ApiError(422,"Only PNG, JPG or WebP images are allowed.");
    const bytes=Buffer.from(await file.arrayBuffer());
    const isPng=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    const isJpg=bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff;
    const isWebp=bytes.toString("ascii",0,4)==="RIFF"&&bytes.toString("ascii",8,12)==="WEBP";
    if(!(isPng||isJpg||isWebp))throw new ApiError(422,"Invalid image file signature.");
    cloudinary.config({cloud_name:process.env.CLOUDINARY_CLOUD_NAME,api_key:process.env.CLOUDINARY_API_KEY,api_secret:process.env.CLOUDINARY_API_SECRET,secure:true});
    const result=await new Promise<{secure_url:string}>( (resolve,reject)=>{
      const stream=cloudinary.uploader.upload_stream({folder:"fitness-power/profiles",resource_type:"image",transformation:[{width:1200,height:1200,crop:"limit"}],unique_filename:true,overwrite:false},(error,result)=>{
        if(error||!result)return reject(error||new Error("Cloudinary did not respond"));resolve({secure_url:result.secure_url});
      });stream.end(bytes);
    });
    return success({url:result.secure_url});
  }catch(e){return failure(e);}
}
