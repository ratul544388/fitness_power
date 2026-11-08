import { z } from "zod";

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid YYYY-MM-DD date")
  .refine(s=>{const d=new Date(`${s}T12:00:00Z`);return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===s;},"Date is not a real calendar day");
const opt = (max = 500) => z.string().max(max).nullish().transform(v => v || null);
const photo = z.string().max(1000).nullish().refine(v => !v || (() => {try {const u = new URL(v);return u.protocol==="https:" && u.hostname==="res.cloudinary.com";} catch {return false;}})(), "Images must be uploaded through Cloudinary").transform(v=>v||null);
const cash = z.coerce.number().int().min(0).max(100000000);
const requiredCash = z.coerce.number().int().min(1).max(100000000);
const uuid = z.string().uuid();
const memberCommon = z.object({ name:z.string().trim().min(2).max(180), phone:opt(40),email:z.union([z.email(),z.literal(""),z.null()]).optional(), gender:z.enum(["male","female","other"]).default("other"),dateOfBirth:dateField.nullish().or(z.literal("")),address:opt(500),emergencyContact:opt(150), imageUrl:photo,notes:opt(2000),status:z.enum(["active","frozen","inactive"]).default("active") });
export const createMember = memberCommon.extend({planId:uuid,startDate:dateField,amountPaid:cash.default(0),paymentMethod:z.enum(["cash","bkash","nagad","bank","card"]).default("cash"),discount:cash.default(0)});
export const updateMember = memberCommon.partial();
export const createPlan = z.object({name:z.string().trim().min(2).max(120),durationMonths:z.coerce.number().int().min(1).max(60),price:cash,description:z.string().max(1000).default(""),color:z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#5786ff"),active:z.boolean().default(true)});
export const updatePlan = createPlan.partial();
export const createLocker = z.object({number:z.string().trim().min(1).max(30),zone:z.string().trim().min(2).max(60).default("Main floor"),size:z.enum(["small","standard","large"]).default("standard"),monthlyRate:cash.default(0),status:z.enum(["available","maintenance"]).default("available"),notes:opt(1000)});
export const updateLocker = createLocker.partial();
export const createExpense = z.object({title:z.string().trim().min(2).max(200),category:z.enum(["rent","utilities","salaries","maintenance","equipment","marketing","supplies","other"]),amount:requiredCash,incurredOn:dateField,paymentMethod:z.enum(["cash","bkash","nagad","bank","card"]).default("cash"),vendor:opt(150),receiptUrl:photo,note:opt(1000)});
export const updateExpense = createExpense.partial();
export const createStaff = z.object({name:z.string().trim().min(2).max(180),jobTitle:z.string().trim().min(2).max(90),phone:opt(40),email:z.union([z.email(),z.literal(""),z.null()]).optional(),salary:cash.default(0),shift:z.string().max(60).default("Morning"),joinedOn:dateField.nullish().or(z.literal("")),status:z.enum(["active","on_leave","inactive"]).default("active"),imageUrl:photo,notes:opt(1000)});
export const updateStaff = createStaff.partial();
export const createPayment = z.object({memberId:uuid, membershipId:uuid.nullish(),amount:requiredCash,method:z.enum(["cash","bkash","nagad","bank","card"]),type:z.enum(["membership","renewal","admission","locker","other"]).default("other"),reference:opt(140),note:opt(1000)});
export const createTeam = z.object({name:z.string().trim().min(2).max(180),email:z.email(),password:z.string().min(12).max(128),appRole:z.enum(["admin","manager","receptionist","viewer"])});
export const updateTeam = z.object({appRole:z.enum(["admin","manager","receptionist","viewer"]).optional(),banned:z.boolean().optional(),name:z.string().trim().min(2).max(180).optional()});
export const updateSettings = z.object({gymName:z.string().trim().min(2).max(150),gymEmail:z.union([z.email(),z.literal(""),z.null()]).optional(),gymPhone:opt(40),gymAddress:opt(500),admissionFee:cash,currency:z.enum(["BDT","USD","EUR","INR"]).default("BDT"),timezone:z.enum(["Asia/Dhaka","Asia/Kolkata","Asia/Dubai","Europe/London","America/New_York"]).default("Asia/Dhaka")});
export const renewMember = z.object({memberId:uuid,planId:uuid,startDate:dateField,amountPaid:cash,method:z.enum(["cash","bkash","nagad","bank","card"]),discount:cash.default(0),note:opt(1000)});
export const checkin = z.object({memberId:uuid});
export const checkout = z.object({attendanceId:uuid});
export const assignLocker = z.object({lockerId:uuid,memberId:uuid,dueOn:dateField.nullish().or(z.literal("")),note:opt(1000)});
export const releaseLocker = z.object({lockerId:uuid});

export type ResourceName = "members"|"plans"|"payments"|"attendance"|"lockers"|"expenses"|"staff"|"team"|"settings"|"audit";
export const resources: ResourceName[] = ["members","plans","payments","attendance","lockers","expenses","staff","team","settings","audit"];
export function isResource(value:string):value is ResourceName{return resources.includes(value as ResourceName);}
export function parseCreate(resource: ResourceName, data:unknown) {
  switch (resource) {
    case "members":return createMember.parse(data);
    case "plans":return createPlan.parse(data);
    case "payments":return createPayment.parse(data);
    case "lockers":return createLocker.parse(data);
    case "expenses":return createExpense.parse(data);
    case "staff":return createStaff.parse(data);
    case "team":return createTeam.parse(data);
    default:throw new Error("Create is not allowed for this section.");
  }
}
export function parseUpdate(resource:ResourceName,data:unknown) {
  switch(resource) {
    case "members":return updateMember.parse(data);
    case "plans":return updatePlan.parse(data);
    case "lockers":return updateLocker.parse(data);
    case "expenses":return updateExpense.parse(data);
    case "staff":return updateStaff.parse(data);
    case "team":return updateTeam.parse(data);
    case "settings":return updateSettings.parse(data);
    default:throw new Error("Edit is not allowed for this section.");
  }
}
