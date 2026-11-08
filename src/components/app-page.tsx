"use client";
import { Suspense } from "react";
import { Dashboard } from "./dashboard";
import { MembersPage } from "./members";
import { PlansPage, StaffPage, PaymentsPage, ExpensesPage } from "./operations";
import { AttendancePage } from "./attendance";
import { LockersPage } from "./lockers";
import { ReportsPage, ActivityPage } from "./insights";
import { SettingsPage, TeamPage } from "./system";
import { SkeletonPage } from "./ui";
type Section="dashboard"|"members"|"attendance"|"plans"|"payments"|"lockers"|"staff"|"expenses"|"reports"|"activity"|"team"|"settings";
export function AppPage({section}:{section:Section}){
  const component={dashboard:<Dashboard/>,members:<MembersPage/>,attendance:<AttendancePage/>,plans:<PlansPage/>,payments:<PaymentsPage/>,lockers:<LockersPage/>,staff:<StaffPage/>,expenses:<ExpensesPage/>,reports:<ReportsPage/>,activity:<ActivityPage/>,team:<TeamPage/>,settings:<SettingsPage/>}[section];
  return <Suspense fallback={<SkeletonPage/>}>{component}</Suspense>;
}
