import { demoEnabled } from "@/lib/permissions";
import { LoginView } from "@/components/login-view";
export const metadata={title:"Sign in"};
export default function LoginPage(){return <LoginView demo={demoEnabled()}/>}
