/**
 * Optional, reversible Neon sample records for Fitness Power.
 *
 * Safe defaults:
 * - Does not modify auth, user, account, session, or verification tables.
 * - Uses stable UUIDs and fictional example.com emails so repeated runs are idempotent.
 * - Does not overwrite existing settings, plans, or lockers.
 * - Rejects DEMO_MODE=true and production environments.
 * - Cleanup only targets the known sample UUIDs, and refuses to delete samples
 *   if a non-sample member is using a sample plan or sample locker.
 */
import { config } from "dotenv";
import { and, inArray, like, not } from "drizzle-orm";

config({ path: ".env.local", override: true });

const TAG = "[FITNESS_POWER_SAMPLE]";
const TOTAL_MEMBERS = 144;
const TOTAL_LOCKERS = 36;
const TOTAL_STAFF = 12;
const TOTAL_EXPENSES = 84;
const TOTAL_AUDIT_LOGS = 72;
const TOTAL_PLANS = 6;

// RFC4122-shaped v4 UUIDs in a reserved-for-this-script namespace.
// These are stable identifiers for idempotency and targeted sample cleanup.
const sampleId = (group: number, n: number) =>
  `4a12a31e-13ab-4e52-8af4-${(group * 1000000 + n).toString(16).padStart(12, "0")}`;

const samplePlanIds = Array.from({ length: TOTAL_PLANS }, (_, i) => sampleId(1, i + 1));
const sampleMemberIds = Array.from({ length: TOTAL_MEMBERS }, (_, i) => sampleId(2, i + 1));
const sampleLockerIds = Array.from({ length: TOTAL_LOCKERS }, (_, i) => sampleId(6, i + 1));
const sampleStaffIds = Array.from({ length: TOTAL_STAFF }, (_, i) => sampleId(8, i + 1));
const sampleExpenseIds = Array.from({ length: TOTAL_EXPENSES }, (_, i) => sampleId(9, i + 1));
const sampleAuditIds = Array.from({ length: TOTAL_AUDIT_LOGS }, (_, i) => sampleId(10, i + 1));

const zone = "Asia/Dhaka";
function todayInDhaka(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const find = (key: string) => parts.find((p) => p.type === key)?.value ?? "";
  return `${find("year")}-${find("month")}-${find("day")}`;
}
function localNoon(date: string): Date { return new Date(`${date}T12:00:00+06:00`); }
function dayOffset(date: string, days: number): string {
  const d = localNoon(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function monthOffset(date: string, count: number): string {
  const d = localNoon(date);
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + count, 1, 6));
  const finalDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0, 6)).getUTCDate();
  target.setUTCDate(Math.min(d.getUTCDate(), finalDay));
  return target.toISOString().slice(0, 10);
}
function at(date: string, hour = 12, minute = 0): Date {
  return new Date(`${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+06:00`);
}
function beforeNow(date: string, hour = 12): Date {
  const wanted = at(date, hour);
  return wanted.getTime() > Date.now() ? new Date(Date.now() - 60000) : wanted;
}
function phone(n: number): string { return `+8801000${String(n).padStart(6, "0")}`; } // intentionally fictional

const men = [
  "Arman", "Fahim", "Rafi", "Sajid", "Tanvir", "Mehedi", "Shafin", "Nabil",
  "Rayhan", "Rahat", "Asif", "Shakil", "Mahin", "Imran", "Tariq", "Riyad",
  "Farhan", "Saif", "Hasan", "Rafiul", "Junaid", "Ashik", "Adnan", "Sami",
];
const women = [
  "Nadia", "Nusrat", "Mim", "Samira", "Farhana", "Tanjila", "Maya", "Raina",
  "Anika", "Nabila", "Tithi", "Sadia", "Zara", "Lamia", "Ayesha", "Faria",
  "Jannat", "Sumaiya", "Tasnim", "Shaila", "Nazia", "Ishrat", "Sneha", "Tania",
];
const surnames = [
  "Rahman", "Islam", "Ahmed", "Hossain", "Chowdhury", "Karim", "Sultana",
  "Kabir", "Siddique", "Hasan", "Akter", "Khan", "Alam", "Saha", "Noor",
];

async function main() {
  const cleaning = process.argv.includes("--clean");
  if (process.env.NODE_ENV === "production" || process.env.VERCEL === "1") {
    throw new Error("Sample data scripts cannot run in production. Use a disposable Neon dev/staging branch.");
  }
  if (process.env.DEMO_MODE === "true") {
    throw new Error('Set DEMO_MODE="false" in .env.local. This script seeds REAL Neon tables, not local preview data.');
  }
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes("YOUR-") || process.env.DATABASE_URL.includes("unused")) {
    throw new Error("Set a valid DATABASE_URL in .env.local before running the sample seed.");
  }
  if (cleaning && !process.argv.includes("--yes-delete-sample-data")) {
    throw new Error("Cleanup requires explicit confirmation: npx tsx scripts/seed-sample.ts --clean --yes-delete-sample-data");
  }
  // Load the DB only after dotenv has configured the live connection string.
  const [{ db }, tables] = await Promise.all([import("../src/db"), import("../src/db/schema")]);
  const { plans, members, memberships, payments, attendance, lockers, lockerAssignments, expenses, staff, settings, auditLogs } = tables;

  if (cleaning) {
    await db.transaction(async (tx) => {
      // Optional test-CSV imports use recognizable, fictional email addresses.
      const imported = await tx.select({ id: members.id }).from(members).where(
        like(members.email, "fp.sample.import.%@example.com"),
      );
      const allSampleMemberIds = [...sampleMemberIds, ...imported.map((row) => row.id)];
      const realMembersOnSamplePlan = await tx.select({ id: members.id }).from(members).where(
        and(inArray(members.planId, samplePlanIds), not(inArray(members.id, allSampleMemberIds))),
      ).limit(1);
      if (realMembersOnSamplePlan.length) throw new Error("A non-sample member uses a sample plan. Reassign the member before cleanup.");
      const realMembershipsOnSamplePlan = await tx.select({ id: memberships.id }).from(memberships).where(
        and(inArray(memberships.planId, samplePlanIds), not(inArray(memberships.memberId, allSampleMemberIds))),
      ).limit(1);
      if (realMembershipsOnSamplePlan.length) throw new Error("A non-sample member has membership history on a sample plan. Keep the plan or resolve the history before cleanup.");
      const realMembersOnSampleLocker = await tx.select({ id: lockerAssignments.id }).from(lockerAssignments).where(
        and(inArray(lockerAssignments.lockerId, sampleLockerIds), not(inArray(lockerAssignments.memberId, allSampleMemberIds))),
      ).limit(1);
      if (realMembersOnSampleLocker.length) throw new Error("A non-sample member has used a sample locker. Reassign that member before cleanup.");

      // Remove histories tied to sample members, including test actions performed in the UI.
      await tx.delete(lockerAssignments).where(inArray(lockerAssignments.memberId, allSampleMemberIds));
      await tx.delete(payments).where(inArray(payments.memberId, allSampleMemberIds));
      await tx.delete(attendance).where(inArray(attendance.memberId, allSampleMemberIds));
      await tx.delete(memberships).where(inArray(memberships.memberId, allSampleMemberIds));
      await tx.delete(members).where(inArray(members.id, allSampleMemberIds));
      await tx.delete(lockers).where(inArray(lockers.id, sampleLockerIds));
      await tx.delete(expenses).where(inArray(expenses.id, sampleExpenseIds));
      await tx.delete(staff).where(inArray(staff.id, sampleStaffIds));
      await tx.delete(plans).where(inArray(plans.id, samplePlanIds));
      await tx.delete(auditLogs).where(inArray(auditLogs.id, sampleAuditIds));
      // Preserve settings, team accounts, and audit logs of actual actions.
    });
    console.log("Sample data cleanup completed. Team Access, owner login and existing gym settings were untouched.");
    return;
  }

  const today = todayInDhaka();
  const planSpecs = [
    ["FP Demo - Monthly", 1, 1500, "Flexible monthly gym access", "#6c8aff"],
    ["FP Demo - Quarterly", 3, 3900, "Three months with better value", "#9c7af8"],
    ["FP Demo - Half Year", 6, 7200, "Six months of full gym access", "#35cda7"],
    ["FP Demo - Annual", 12, 13200, "Year-long all-access membership", "#e9b76d"],
    ["FP Demo - Student", 1, 1100, "Discounted student membership", "#55b3e4"],
    ["FP Demo - Premium", 3, 5900, "Premium facilities and priority locker", "#ef8aa7"],
  ] as const;
  const planRows: Array<typeof plans.$inferInsert> = planSpecs.map(([name, durationMonths, price, description, color], i) => ({
    id: samplePlanIds[i], name, durationMonths, price, description, color, active: true,
  }));
  const memberRows: Array<typeof members.$inferInsert> = [];
  const membershipRows: Array<typeof memberships.$inferInsert> = [];
  const paymentRows: Array<typeof payments.$inferInsert> = [];
  const attendanceRows: Array<typeof attendance.$inferInsert> = [];
  const lockerRows: Array<typeof lockers.$inferInsert> = [];
  const assignmentRows: Array<typeof lockerAssignments.$inferInsert> = [];
  const staffRows: Array<typeof staff.$inferInsert> = [];
  const expenseRows: Array<typeof expenses.$inferInsert> = [];
  const auditRows: Array<typeof auditLogs.$inferInsert> = [];
  let periodSeq = 0, paymentSeq = 0, attendanceSeq = 0, assignmentSeq = 0;
  const addPayment = (entry: Omit<typeof payments.$inferInsert, "id">) => {
    paymentRows.push({ id: sampleId(4, ++paymentSeq), ...entry });
  };

  for (let i = 0; i < TOTAL_MEMBERS; i++) {
    const plan = planRows[i % planRows.length];
    const mid = sampleMemberIds[i];
    const female = i % 3 === 1;
    const first = female ? women[(i * 5) % women.length] : men[(i * 7) % men.length];
    const last = surnames[(i * 11 + 2) % surnames.length];
    const segment = i % 24;
    const kind = segment <= 13 ? "active" : segment <= 17 ? "expiring" : segment <= 20 ? "expired" : segment === 21 ? "frozen" : "inactive";
    const duration = plan.durationMonths;
    const remaining = duration === 1 ? 12 + (i % 15) : duration === 3 ? 22 + (i * 3) % 70 : duration === 6 ? 32 + (i * 5) % 110 : 50 + (i * 9) % 230;
    const expiresOn = kind === "active" ? dayOffset(today, remaining)
      : kind === "expiring" ? dayOffset(today, 1 + i % 7)
      : kind === "frozen" ? dayOffset(today, 15 + i % 50)
      : dayOffset(today, -(3 + (i * 5) % 74));
    const startsOn = monthOffset(expiresOn, -duration);
    const status = kind === "frozen" ? "frozen" : kind === "inactive" ? "inactive" : "active";
    const hasRenewal = i % 4 === 0;
    const joinedOn = hasRenewal ? monthOffset(startsOn, -duration) : startsOn;
    memberRows.push({
      id: mid, name: `${first} ${last}`, gender: female ? "female" : "male",
      phone: phone(i + 1), email: `fp.sample.member.${String(i + 1).padStart(3, "0")}@example.com`,
      dateOfBirth: `${1980 + (i * 7) % 25}-${String(1 + (i * 3) % 12).padStart(2, "0")}-${String(1 + (i * 5) % 27).padStart(2, "0")}`,
      address: ["Dhanmondi", "Mirpur", "Uttara", "Gulshan", "Mohammadpur", "Bashundhara", "Banani", "Tejgaon"][i % 8] + ", Dhaka (fictional)",
      emergencyContact: `Sample contact ${phone(i + 501)}`,
      planId: plan.id, startDate: startsOn, expireDate: expiresOn, status,
      joinedAt: beforeNow(joinedOn, 9), notes: `${TAG} Fictional member for testing. Not a real customer.`,
    });

    if (hasRenewal) {
      const prevEnd = dayOffset(startsOn, -1);
      const prevStart = monthOffset(prevEnd, -duration);
      const oldId = sampleId(3, ++periodSeq);
      membershipRows.push({
        id: oldId, memberId: mid, planId: plan.id, startsOn: prevStart, expiresOn: prevEnd,
        planPrice: plan.price, admissionFee: 300, discount: 0, type: "join",
        note: TAG, createdAt: beforeNow(prevStart, 9),
      });
      addPayment({
        memberId: mid, membershipId: oldId, amount: plan.price + 300, type: "membership",
        method: ["cash", "bkash", "nagad", "bank", "card"][i % 5],
        reference: `FP-DEMO-OLD-${String(i + 1).padStart(4, "0")}`,
        paidAt: beforeNow(prevStart, 11), note: TAG,
      });
    }

    const currentId = sampleId(3, ++periodSeq);
    const fee = hasRenewal ? 0 : 300;
    const discount = i % 7 === 0 ? 150 : 0;
    const total = plan.price + fee - discount;
    membershipRows.push({
      id: currentId, memberId: mid, planId: plan.id, startsOn, expiresOn,
      planPrice: plan.price, admissionFee: fee, discount, type: hasRenewal ? "renewal" : "join",
      note: TAG, createdAt: beforeNow(startsOn, 9),
    });
    const paid = i % 13 === 0 ? Math.floor(total * 0.7) : total; // unpaid balance for payment tests
    const method = ["cash", "bkash", "nagad", "bank", "card"][i % 5];
    if (i % 5 === 0) {
      const firstInstallment = Math.floor(paid * 0.6);
      addPayment({ memberId: mid, membershipId: currentId, amount: firstInstallment,
        method, type: hasRenewal ? "renewal" : "membership",
        reference: `FP-DEMO-${i + 1}-A`, note: TAG, paidAt: beforeNow(startsOn, 10) });
      addPayment({ memberId: mid, membershipId: currentId, amount: paid - firstInstallment,
        method: "bkash", type: hasRenewal ? "renewal" : "membership",
        reference: `FP-DEMO-${i + 1}-B`, note: TAG, paidAt: beforeNow(dayOffset(startsOn, 2), 15) });
    } else {
      addPayment({ memberId: mid, membershipId: currentId, amount: paid,
        method, type: hasRenewal ? "renewal" : "membership",
        reference: `FP-DEMO-${String(i + 1).padStart(4, "0")}`, note: TAG,
        paidAt: beforeNow(startsOn, 11) });
    }
  }

  // Small supplementary transactions distributed across seven months.
  for (let i = 0; i < 100; i++) {
    const date = i < 8 ? today : dayOffset(today, -(1 + (i * 13) % 192));
    const member = memberRows[(i * 17) % memberRows.length];
    addPayment({ memberId: member.id!, amount: 300 + (i % 3) * 100,
      method: ["cash", "bkash", "nagad", "bank", "card"][i % 5], type: i % 4 === 0 ? "other" : "locker",
      reference: `FP-DEMO-EXTRA-${String(i + 1).padStart(3, "0")}`,
      note: TAG, paidAt: beforeNow(date, 10 + i % 8) });
  }

  const activeRows = memberRows.filter(m => m.status === "active" && m.expireDate! >= today);
  // All historical visits have a checkout. The open visits below are unique per member.
  for (let i = 0; i < 670; i++) {
    const date = dayOffset(today, -(1 + (i * 17) % 85));
    const eligible = activeRows.filter(m => m.startDate! <= date);
    if (!eligible.length) continue;
    const member = eligible[(i * 11) % eligible.length];
    const hour = [6, 7, 8, 16, 17, 18, 19, 20][i % 8];
    attendanceRows.push({
      id: sampleId(5, ++attendanceSeq), memberId: member.id!,
      checkedInAt: at(date, hour, 3 + i % 46),
      checkedOutAt: at(date, Math.min(hour + 1 + i % 2, 23), 7 + i % 39),
      source: "manual", note: TAG,
    });
  }
  const todayStart = at(today, 0).getTime();
  const availableMinutes = Math.floor((Date.now() - todayStart) / 60000) - 3;
  if (availableMinutes >= 7) {
    const visitsToday = Math.min(20, Math.max(4, Math.floor(availableMinutes / 25)));
    for (let i = 0; i < visitsToday; i++) {
      const checkedInAt = new Date(Date.now() - Math.min(availableMinutes, 7 + i * 20) * 60000);
      attendanceRows.push({
        id: sampleId(5, ++attendanceSeq), memberId: activeRows[i].id!, checkedInAt,
        checkedOutAt: i < 4 ? null : new Date(Math.min(Date.now() - 60000, checkedInAt.getTime() + 45 * 60000)),
        source: "manual", note: TAG,
      });
    }
  }

  const lockerZones = ["Sample · Ground floor", "Sample · First floor", "Sample · Women’s area", "Sample · Premium zone"];
  for (let i = 0; i < TOTAL_LOCKERS; i++) {
    const lockerId = sampleLockerIds[i];
    const occupied = i < 20;
    lockerRows.push({
      id: lockerId, number: `T-${String(i + 1).padStart(2, "0")}`,
      zone: lockerZones[Math.floor(i / 9)], size: i % 6 === 0 ? "large" : "standard",
      monthlyRate: i % 6 === 0 ? 600 : 350,
      // "occupied" is derived from the active assignment, not persisted on the locker.
      // Keeping the base status available makes release -> reassign work correctly.
      status: i >= 20 && i < 26 ? "maintenance" : "available",
      notes: `${TAG} Sample locker`,
    });
    if (occupied) {
      assignmentRows.push({
        id: sampleId(7, ++assignmentSeq), lockerId, memberId: activeRows[i].id!,
        assignedAt: beforeNow(dayOffset(today, -14 - i % 22), 10),
        dueOn: dayOffset(today, (i % 5 === 0 ? -4 : 8) + i), note: TAG,
      });
    }
    if (i >= 26 && i < 34) {
      assignmentRows.push({
        id: sampleId(7, ++assignmentSeq), lockerId,
        memberId: activeRows[(i + 20) % activeRows.length].id!,
        assignedAt: beforeNow(dayOffset(today, -65 - i), 10),
        releasedAt: beforeNow(dayOffset(today, -28 - i % 10), 19), note: `${TAG} Released locker history`,
      });
    }
  }

  const staffSpecs = [
    ["Sakib Hasan", "Head Trainer", 42000, "Morning", "active"],
    ["Nabila Karim", "Fitness Coach", 32000, "Evening", "active"],
    ["Riyad Islam", "Front Desk", 24000, "Rotating", "active"],
    ["Ayesha Noor", "Nutrition Coach", 37000, "Morning", "on_leave"],
    ["Mehedi Rahman", "Strength Trainer", 34000, "Evening", "active"],
    ["Farhana Sultana", "Yoga Instructor", 28000, "Morning", "active"],
    ["Tasnim Akter", "Receptionist", 22000, "Rotating", "active"],
    ["Arif Hossain", "Maintenance", 20000, "Morning", "active"],
    ["Samira Khan", "Pilates Trainer", 30000, "Evening", "active"],
    ["Tanvir Chowdhury", "Operations Lead", 44000, "Morning", "active"],
    ["Raina Islam", "Fitness Coach", 28000, "Evening", "inactive"],
    ["Mahin Ahmed", "Cleaning Supervisor", 19000, "Rotating", "active"],
  ] as const;
  staffSpecs.forEach(([name, jobTitle, salary, shift, status], i) => {
    staffRows.push({
      id: sampleStaffIds[i], name, jobTitle, salary, shift, status, phone: phone(901 + i),
      email: `fp.sample.staff.${String(i + 1).padStart(2, "0")}@example.com`,
      joinedOn: dayOffset(today, -45 - (i * 51) % 580),
      notes: `${TAG} Fictional employee, not a dashboard login.`,
    });
  });

  const expenseSpecs = [
    ["Facility rent", "rent", "Sample Properties", 29000],
    ["Electricity and water", "utilities", "Sample Utility Provider", 8800],
    ["Trainer payroll provision", "salaries", "Sample Payroll", 34000],
    ["Treadmill servicing", "maintenance", "Sample Gym Repairs", 4200],
    ["Gym social media ads", "marketing", "Sample Ad Agency", 3800],
    ["Cleaning and hygiene", "supplies", "Sample Supply Store", 1850],
    ["New dumbbells", "equipment", "Sample Fitness Wholesale", 12500],
    ["Miscellaneous operational cost", "other", "Sample Vendor", 1250],
  ] as const;
  for (let i = 0; i < TOTAL_EXPENSES; i++) {
    const [title, category, vendor, base] = expenseSpecs[i % expenseSpecs.length];
    const date = dayOffset(today, -((i * 17 + (i % 5) * 7) % 204));
    expenseRows.push({
      id: sampleExpenseIds[i], title, category, vendor,
      amount: base + ((i * 61) % 1100), incurredOn: date,
      paymentMethod: ["cash", "bkash", "nagad", "bank", "card"][i % 5],
      note: `${TAG} Fictional accounting transaction`,
    });
  }

  const activityEntities = ["members", "plans", "payments", "attendance", "lockers", "staff", "expenses"] as const;
  const activityTargetIds = [sampleMemberIds[0], samplePlanIds[0], paymentRows[0].id!, attendanceRows[0]?.id ?? sampleMemberIds[0], sampleLockerIds[0], sampleStaffIds[0], sampleExpenseIds[0]];
  for (let i = 0; i < TOTAL_AUDIT_LOGS; i++) {
    const entityIndex = i % activityEntities.length;
    auditRows.push({
      id: sampleAuditIds[i], actorId: null,
      action: ["created", "updated", "renewed", "checked_in", "assigned", "recorded", "reviewed"][i % 7],
      entity: activityEntities[entityIndex], entityId: activityTargetIds[entityIndex],
      detail: { sample: true, message: "Example audit entry - not a real employee action" },
      createdAt: beforeNow(dayOffset(today, -(i * 3) % 55), 10 + i % 8),
    });
  }

  await db.transaction(async (tx) => {
    // Keep customized gym settings intact; only create a fallback row when absent.
    await tx.insert(settings).values({
      id: "main", gymName: "Fitness Power", currency: "BDT", timezone: zone,
      gymEmail: "gym@example.com", gymAddress: "Fictional demo gym · Dhaka",
      admissionFee: 300,
    }).onConflictDoNothing();
    await tx.insert(plans).values(planRows).onConflictDoNothing();
    await tx.insert(members).values(memberRows).onConflictDoNothing();
    await tx.insert(memberships).values(membershipRows).onConflictDoNothing();
    await tx.insert(payments).values(paymentRows).onConflictDoNothing();
    await tx.insert(attendance).values(attendanceRows).onConflictDoNothing();
    await tx.insert(lockers).values(lockerRows).onConflictDoNothing();
    await tx.insert(lockerAssignments).values(assignmentRows).onConflictDoNothing();
    await tx.insert(staff).values(staffRows).onConflictDoNothing();
    await tx.insert(expenses).values(expenseRows).onConflictDoNothing();
    await tx.insert(auditLogs).values(auditRows).onConflictDoNothing();
  });
  console.log(`\nSample data is ready in Neon (${today}, ${zone}):`);
  console.log(`  ${planRows.length} membership plans`);
  console.log(`  ${memberRows.length} members and ${membershipRows.length} membership periods`);
  console.log(`  ${paymentRows.length} payments (membership dues + extras)`);
  console.log(`  ${attendanceRows.length} attendance records, including today's check-ins`);
  console.log(`  ${lockerRows.length} lockers, ${assignmentRows.length} assignment histories`);
  console.log(`  ${staffRows.length} staff records; ${expenseRows.length} expenses`);
  console.log(`  ${auditRows.length} sample activity-log entries`);
  console.log("  Dashboard and reports derive from these sample transactions.");
  console.log("  Team Access accounts and existing settings have not been changed.");
  console.log("\nRe-running is safe: sample IDs remain the same and duplicates are skipped.");
  console.log("Cleanup: npx tsx scripts/seed-sample.ts --clean --yes-delete-sample-data");
}

main().then(() => process.exit(0)).catch((error: unknown) => {
  console.error("Sample seed failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
