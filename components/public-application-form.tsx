"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  Download,
  LoaderCircle,
  Send,
} from "lucide-react";
import { RiverproLogo } from "@/components/riverpro-footer";
import { ThemeToggle } from "@/components/theme-provider";
import { supabase } from "@/lib/supabase";

type PublicJob = {
  job_code: string;
  title: string;
  department: string | null;
  location: string | null;
  employment_type: string | null;
  close_date: string | null;
};

type ApplicationState =
  | { type: "idle" | "loading" }
  | { type: "error"; message: string }
  | {
      type: "success";
      code: string;
      applicantEmail: string;
      alreadySubmitted?: boolean;
      notificationError?: string;
    };

type ApplicationFieldType =
  | "text"
  | "email"
  | "number"
  | "date"
  | "tel"
  | "url"
  | "select"
  | "checkboxes"
  | "textarea";

type ApplicationField = {
  name: string;
  label: string;
  type: ApplicationFieldType;
  options?: string[];
  wide?: boolean;
  sensitive?: boolean;
  maxLength?: number;
  required?: boolean;
  page: number;
};

type PrintableEntry = {
  name: string;
  label: string;
  value: string;
  page: number;
  wide?: boolean;
};

const profileField = (
  name: string,
  label: string,
  type: ApplicationFieldType = "text",
  options?: string[],
  wide = false,
  sensitive = false,
  maxLength = 180,
  page = 1,
): ApplicationField => ({
  name: `profile.${name}`,
  label,
  type,
  options,
  wide,
  sensitive,
  maxLength,
  page,
});

const PAGE_ONE_FIELDS: ApplicationField[] = [
  profileField(
    "applicant_company",
    "บริษัทที่สมัคร",
    "checkboxes",
    [
      "บริษัท กระดาษธนธาร จำกัด",
      "บริษัท ริเวอร์โปร พัลพ แอนด์ เพเพอร์ จำกัด",
      "บริษัท ริเวอร์โปร อินเตอร์เทรด จำกัด",
      "อื่น ๆ",
    ],
    true,
  ),
  profileField("applicant_company_other", "ระบุบริษัทอื่น"),
  profileField("desired_position_1", "ตำแหน่งงานที่ต้องการสมัคร ลำดับ 1"),
  profileField("desired_position_2", "ตำแหน่งงานที่ต้องการสมัคร ลำดับ 2"),
  profileField(
    "salary_expectation_min",
    "เงินเดือนที่ต้องการ (ขั้นต่ำ)",
    "number",
  ),
  profileField(
    "salary_expectation_max",
    "เงินเดือนที่ต้องการ (สูงสุด)",
    "number",
  ),
  profileField("applicant_photo_1", "รูปถ่ายผู้สมัคร 1 (ลิงก์ไฟล์)", "url"),
  profileField("applicant_photo_2", "รูปถ่ายผู้สมัคร 2 (ลิงก์ไฟล์)", "url"),
  profileField("applicant_title", "คำนำหน้า"),
  profileField("name_english", "ชื่อ - นามสกุล (ภาษาอังกฤษ)"),
  profileField("gender", "เพศ", "select", ["ชาย", "หญิง", "ไม่ประสงค์ระบุ"]),
  profileField("age_years", "อายุ (ปี)", "number"),
  profileField("age_months", "อายุ (เดือน)", "number"),
  profileField("weight_kg", "น้ำหนัก (กก.)", "number"),
  profileField("height_cm", "ส่วนสูง (ซม.)", "number"),
  profileField("complexion", "สีผิว"),
  profileField("blood_type", "กรุ๊ปเลือด", "select", [
    "A",
    "B",
    "AB",
    "O",
    "ไม่ทราบ",
  ]),
  profileField("date_of_birth", "วัน / เดือน / ปีเกิด", "date"),
  profileField("birth_province", "จังหวัดที่เกิด"),
  profileField("nationality", "สัญชาติ"),
  profileField("ethnicity", "เชื้อชาติ"),
  profileField("religion", "ศาสนา"),
  profileField(
    "national_id",
    "เลขประจำตัวประชาชน",
    "text",
    undefined,
    false,
    true,
  ),
  profileField("id_issued_at", "สถานที่ออกบัตร"),
  profileField("id_expires_on", "วันหมดอายุบัตร", "date"),
  profileField(
    "current_address",
    "ที่อยู่ปัจจุบัน",
    "textarea",
    undefined,
    true,
  ),
  profileField("current_phone", "โทรศัพท์บ้าน (ที่อยู่ปัจจุบัน)", "tel"),
  profileField("current_mobile", "มือถือ (ที่อยู่ปัจจุบัน)", "tel"),
  profileField(
    "registered_address",
    "ที่อยู่ตามทะเบียนบ้าน",
    "textarea",
    undefined,
    true,
  ),
  profileField("registered_phone", "โทรศัพท์บ้าน (ทะเบียนบ้าน)", "tel"),
  profileField("registered_mobile", "มือถือ (ทะเบียนบ้าน)", "tel"),
  profileField("living_with", "ปัจจุบันพักอาศัยอยู่กับ", "select", [
    "บ้านบิดามารดา",
    "บ้านตนเอง",
    "บ้านเช่า",
    "หอพัก",
    "อื่น ๆ",
  ]),
  profileField("father_name", "ชื่อบิดา"),
  profileField("father_age", "อายุบิดา (ปี)", "number"),
  profileField("father_occupation", "อาชีพบิดา"),
  profileField(
    "father_workplace",
    "สถานที่ทำงานของบิดา",
    "text",
    undefined,
    true,
  ),
  profileField("mother_name", "ชื่อมารดา"),
  profileField("mother_age", "อายุมารดา (ปี)", "number"),
  profileField("mother_occupation", "อาชีพมารดา"),
  profileField(
    "mother_workplace",
    "สถานที่ทำงานของมารดา",
    "text",
    undefined,
    true,
  ),
  profileField("older_brothers", "จำนวนพี่ชาย (คน)", "number"),
  profileField("younger_brothers", "จำนวนน้องชาย (คน)", "number"),
  profileField("older_sisters", "จำนวนพี่สาว (คน)", "number"),
  profileField("younger_sisters", "จำนวนน้องสาว (คน)", "number"),
  profileField("vision_near", "สายตาสั้น", "select", ["ไม่มี", "มี"]),
  profileField("vision_far", "สายตายาว", "select", ["ไม่มี", "มี"]),
  profileField("physical_status", "สภาพร่างกาย", "select", [
    "ครบสมบูรณ์",
    "มีความผิดปกติ",
  ]),
  profileField(
    "disability_details",
    "โปรดระบุความพิการ / ส่วนของร่างกาย",
    "textarea",
    undefined,
    true,
    true,
  ),
  profileField(
    "tax_id",
    "เลขประจำตัวผู้เสียภาษี",
    "text",
    undefined,
    false,
    true,
  ),
  profileField("tax_id_issued_at", "สถานที่ออกบัตรผู้เสียภาษี"),
  profileField(
    "hospital_history",
    "เคยประสบอุบัติเหตุหรือพักรักษาตัวในโรงพยาบาล",
    "select",
    ["ไม่เคย", "เคย"],
    false,
    true,
  ),
  profileField(
    "hospital_history_reason",
    "สาเหตุ / อาการบาดเจ็บ",
    "textarea",
    undefined,
    true,
    true,
  ),
  profileField("marital_status", "สถานภาพการสมรส", "select", [
    "โสด",
    "สมรสแล้ว",
    "หม้าย",
    "หย่าแล้ว",
    "แยกกันอยู่",
    "ไม่ได้จดทะเบียนสมรส",
  ]),
  ...Array.from({ length: 4 }, (_, index) => {
    const child = index + 1;
    return [
      profileField(
        `child_${child}_gender`,
        `บุตรคนที่ ${child}: เพศ`,
        "select",
        ["ชาย", "หญิง", "ไม่ระบุ"],
      ),
      profileField(
        `child_${child}_age`,
        `บุตรคนที่ ${child}: อายุ (ปี)`,
        "number",
      ),
    ];
  }).flat(),
  profileField("spouse_name", "ชื่อคู่สมรส"),
  profileField("spouse_age", "อายุคู่สมรส (ปี)", "number"),
  profileField("spouse_occupation", "อาชีพ / ตำแหน่งงานของคู่สมรส"),
  profileField("spouse_salary", "เงินเดือนคู่สมรส", "number"),
  profileField(
    "spouse_workplace",
    "บริษัท / สถานที่ทำงานคู่สมรส",
    "text",
    undefined,
    true,
  ),
  profileField("spouse_address", "ที่อยู่คู่สมรส", "textarea", undefined, true),
  profileField("spouse_phone", "โทรศัพท์คู่สมรส", "tel"),
  profileField("spouse_mobile", "มือถือคู่สมรส", "tel"),
  profileField("favorite_sports", "กีฬาที่ชอบ"),
  profileField("hobbies", "งานอดิเรก", "textarea", undefined, true),
  profileField("available_from", "พร้อมปฏิบัติหน้าที่ได้ตั้งแต่วันที่", "date"),
  profileField(
    "availability_reason",
    "เหตุผล / เงื่อนไขการเริ่มงาน",
    "text",
    undefined,
    true,
  ),
  profileField("travel_availability", "สามารถไปทำงานต่างจังหวัด", "select", [
    "ได้",
    "ไม่ได้",
  ]),
  profileField(
    "travel_reason",
    "เหตุผล / รายละเอียดการเดินทาง",
    "text",
    undefined,
    true,
  ),
  profileField("overtime_availability", "สามารถทำงานนอกเวลาปกติ", "select", [
    "ได้",
    "ไม่ได้",
  ]),
  profileField(
    "overtime_reason",
    "เหตุผล / รายละเอียดการทำงานนอกเวลา",
    "text",
    undefined,
    true,
  ),
  profileField(
    "application_source",
    "ทราบข่าวการรับสมัครจาก",
    "text",
    undefined,
    true,
  ),
  profileField(
    "preferred_interview_channel",
    "ช่องทางสัมภาษณ์ที่สะดวก",
    "select",
    ["ออนไลน์ (Video call)", "โทรศัพท์", "สัมภาษณ์ที่บริษัท", "อื่น ๆ"],
  ),
  profileField(
    "preferred_interview_times",
    "วันและเวลาที่สะดวกสำหรับสัมภาษณ์",
    "text",
    undefined,
    true,
  ),
];

const EDUCATION_LEVELS = [
  "มัธยมศึกษา",
  "อาชีวศึกษา (ปวช.)",
  "อนุปริญญา (ปวส.)",
  "ปริญญาตรี",
  "ปริญญาโท",
  "กำลังศึกษาอยู่",
  "อื่น ๆ",
];

const PAGE_TWO_FIELDS: ApplicationField[] = [
  ...EDUCATION_LEVELS.flatMap((level, index) => {
    const row = index + 1;
    return [
      profileField(
        `education_${row}_level`,
        `ระดับการศึกษาลำดับ ${row}`,
        "select",
        EDUCATION_LEVELS,
      ),
      profileField(`education_${row}_school`, `สถานศึกษา (${level})`),
      profileField(`education_${row}_province`, "จังหวัด", "text"),
      profileField(
        `education_${row}_graduation_year`,
        "ปีที่จบการศึกษา",
        "text",
      ),
      profileField(`education_${row}_major`, "แผนก / สาขาวิชา"),
      profileField(`education_${row}_gpa`, "เกรดเฉลี่ย", "number"),
    ];
  }),
  ...[
    ["English", "อังกฤษ"],
    ["Japanese", "ญี่ปุ่น"],
    ["Chinese", "จีน"],
    ["Other", "ภาษาอื่น ๆ"],
  ].flatMap(([key, label], index) =>
    ["ความเข้าใจ", "การพูด / สนทนา", "การอ่าน", "การเขียน"].map(
      (skill, skillIndex) =>
        profileField(
          `language_${index + 1}_${skillIndex + 1}`,
          `${label} (${key}): ${skill} (1 ดี / 2 ปานกลาง / 3 อ่อน)`,
          "select",
          ["1 - ดี", "2 - ปานกลาง", "3 - อ่อน"],
        ),
    ),
  ),
  profileField("typing_enabled", "พิมพ์ดีด", "select", ["ไม่ได้", "ได้"]),
  profileField("typing_thai", "พิมพ์ภาษาไทย (คำ/นาที)", "number"),
  profileField("typing_english", "พิมพ์ภาษาอังกฤษ (คำ/นาที)", "number"),
  profileField("computer_enabled", "ใช้คอมพิวเตอร์", "select", [
    "ไม่ได้",
    "ได้",
  ]),
  profileField(
    "computer_skills",
    "โปรแกรมคอมพิวเตอร์ที่ใช้ได้",
    "text",
    undefined,
    true,
  ),
  profileField("car_driving", "ขับรถยนต์", "select", ["ไม่ได้", "ได้"]),
  profileField("driving_license_type", "ใบขับขี่ประเภท"),
  profileField("driving_license_number", "เลขที่ใบขับขี่"),
  profileField("driving_license_issued_at", "ออกให้เมื่อ", "date"),
  profileField("forklift_driving", "ขับรถโฟร์คลิฟท์", "select", [
    "ไม่ได้",
    "ได้",
  ]),
  profileField("forklift_experience_years", "ประสบการณ์ (ปี)", "number"),
  profileField("forklift_load_type", "ของที่ยกได้"),
  profileField("other_skills", "ความสามารถอื่น ๆ", "textarea", undefined, true),
  ...Array.from({ length: 2 }, (_, index) => {
    const row = index + 1;
    return [
      profileField(
        `emergency_${row}_name`,
        `ผู้ติดต่อฉุกเฉิน ${row}: ชื่อ - นามสกุล`,
      ),
      profileField(
        `emergency_${row}_relationship`,
        "เกี่ยวข้องกับผู้สมัครโดยเป็น",
      ),
      profileField(`emergency_${row}_workplace`, "ที่อยู่ / ที่ทำงาน"),
      profileField(`emergency_${row}_phone`, "โทรศัพท์", "tel"),
      profileField(`emergency_${row}_mobile`, "มือถือ", "tel"),
    ];
  }).flat(),
  ...Array.from({ length: 4 }, (_, index) =>
    profileField(
      `education_activity_${index + 1}`,
      `กิจกรรมระหว่างการศึกษา ${index + 1}`,
      "text",
      undefined,
      true,
    ),
  ),
  ...Array.from({ length: 4 }, (_, index) => {
    const row = index + 1;
    return [
      profileField(`training_${row}_year`, `อบรม ${row}: ปี พ.ศ.`),
      profileField(`training_${row}_course`, "เรื่อง / หลักสูตร"),
      profileField(`training_${row}_provider`, "หน่วยงาน / สถาบันผู้จัด"),
      profileField(`training_${row}_duration`, "ระยะเวลา / วัน / ชั่วโมง"),
    ];
  }).flat(),
  ...Array.from({ length: 2 }, (_, index) => {
    const row = index + 1;
    return [
      profileField(
        `internship_${row}_start`,
        `ฝึกงาน ${row}: วันที่เริ่ม`,
        "date",
      ),
      profileField(`internship_${row}_end`, "วันที่สิ้นสุด", "date"),
      profileField(`internship_${row}_company`, "บริษัท"),
      profileField(`internship_${row}_industry`, "ประเภทกิจการ"),
      profileField(
        `internship_${row}_responsibility`,
        "หน้าที่ความรับผิดชอบ",
        "textarea",
        undefined,
        true,
      ),
    ];
  }).flat(),
].map((field) => ({ ...field, page: 2 }));

const PAGE_THREE_FIELDS: ApplicationField[] = [
  ...Array.from({ length: 5 }, (_, index) => {
    const row = index + 1;
    return [
      profileField(`work_${row}_start`, `งานลำดับ ${row}: วันที่เริ่ม`, "date"),
      profileField(`work_${row}_end`, "วันที่สิ้นสุด", "date"),
      profileField(`work_${row}_company`, "ชื่อบริษัท"),
      profileField(`work_${row}_province`, "จังหวัด"),
      profileField(`work_${row}_phone`, "โทรศัพท์", "tel"),
      profileField(`work_${row}_industry`, "ประเภทกิจการ"),
      profileField(
        `work_${row}_last_salary`,
        "เงินเดือนครั้งสุดท้าย",
        "number",
      ),
      profileField(`work_${row}_position`, "ตำแหน่ง"),
      profileField(
        `work_${row}_responsibilities`,
        "หน้าที่ / ลักษณะงาน",
        "textarea",
        undefined,
        true,
      ),
      profileField(
        `work_${row}_reason_for_leaving`,
        "เหตุที่ออก",
        "text",
        undefined,
        true,
      ),
    ];
  }).flat(),
  profileField("military_status", "ผ่านการรับราชการทหาร", "select", [
    "ยังไม่ผ่าน",
    "ผ่านแล้ว",
    "ศึกษาวิชาทหาร",
    "ได้รับการยกเว้น",
  ]),
  profileField("military_branch", "สังกัด"),
  profileField("military_duty", "หน้าที่"),
  profileField("military_reserve_years", "ศึกษาวิชาทหาร (ปี)", "number"),
  profileField(
    "military_exemption_reason",
    "ได้รับการยกเว้นเพราะ",
    "text",
    undefined,
    true,
  ),
  profileField(
    "organization_membership",
    "เคยเป็นสมาชิกชมรม / สมาคม / สหภาพ",
    "select",
    ["ไม่เคย", "เคย"],
  ),
  profileField(
    "organization_membership_years",
    "ระยะเวลาเป็นสมาชิก (ปี)",
    "number",
  ),
  profileField(
    "organization_membership_details",
    "ชื่อองค์กร / ตำแหน่งขณะเป็นสมาชิก",
    "text",
    undefined,
    true,
  ),
  profileField("smoking_status", "บุหรี่", "select", [
    "ไม่สูบ",
    "เพิ่งเลิกสูบ",
    "สูบ",
  ]),
  profileField(
    "smoking_quit_days",
    "เลิกสูบมาแล้ว (วัน)",
    "number",
    undefined,
    false,
    true,
  ),
  profileField(
    "smoking_cigarettes_per_day",
    "สูบเฉลี่ยวันละ (มวน)",
    "number",
    undefined,
    false,
    true,
  ),
  profileField("alcohol_status", "สุรา", "select", [
    "ไม่ดื่ม",
    "เพิ่งเลิกดื่ม",
    "ดื่ม",
  ]),
  profileField(
    "alcohol_quit_days",
    "เลิกดื่มมาแล้ว (วัน)",
    "number",
    undefined,
    false,
    true,
  ),
  profileField(
    "alcohol_times_per_month",
    "ดื่มเฉลี่ยเดือนละ (ครั้ง)",
    "number",
    undefined,
    false,
    true,
  ),
  profileField("shift_work", "สามารถทำงานเป็นกะ", "select", ["ได้", "ไม่ได้"]),
  profileField("shift_work_reason", "เหตุผล", "text", undefined, true),
  profileField(
    "color_vision",
    "ตาบอดสี",
    "select",
    ["ไม่ใช่", "ใช่"],
    false,
    true,
  ),
  profileField(
    "color_vision_details",
    "รายละเอียดตาบอดสี",
    "text",
    undefined,
    true,
    true,
  ),
  profileField(
    "chemical_allergy",
    "เคยแพ้สารเคมีหรือฝุ่น",
    "select",
    ["ไม่ใช่", "ใช่"],
    false,
    true,
  ),
  profileField(
    "chemical_allergy_details",
    "รายละเอียดการแพ้",
    "text",
    undefined,
    true,
    true,
  ),
  profileField(
    "company_relative",
    "มีญาติ / คนรู้จัก / เพื่อนทำงานในบริษัทหรือบริษัทในเครือ",
    "select",
    ["ไม่มี", "มี"],
  ),
  ...Array.from({ length: 3 }, (_, index) => {
    const row = index + 1;
    return [
      profileField(
        `company_contact_${row}_name`,
        `บุคคลในบริษัท ${row}: ชื่อ - นามสกุล`,
      ),
      profileField(`company_contact_${row}_position`, "ตำแหน่ง / ฝ่าย"),
      profileField(`company_contact_${row}_company`, "บริษัทที่ทำงาน"),
      profileField(`company_contact_${row}_relationship`, "ความสัมพันธ์"),
      profileField(
        `company_contact_${row}_known_years`,
        "รู้จักกันมา (ปี)",
        "number",
      ),
    ];
  }).flat(),
  profileField(
    "current_address_map",
    "แผนที่ / จุดสังเกตที่อยู่ปัจจุบัน",
    "textarea",
    undefined,
    true,
  ),
].map((field) => ({ ...field, page: 3 }));

const PAGE_FOUR_FIELDS: ApplicationField[] = [
  ...Array.from({ length: 3 }, (_, index) => {
    const row = index + 1;
    return [
      profileField(
        `reference_${row}_name`,
        `บุคคลอ้างอิง ${row}: ชื่อ - นามสกุล`,
      ),
      profileField(`reference_${row}_relationship`, "ความสัมพันธ์"),
      profileField(`reference_${row}_occupation`, "อาชีพ"),
      profileField(`reference_${row}_work_address`, "ที่อยู่ / สถานที่ทำงาน"),
      profileField(`reference_${row}_phone`, "โทรศัพท์", "tel"),
    ];
  }).flat(),
  profileField(
    "additional_information",
    "คำชี้แจงเพิ่มเติม / งานที่ถนัดเป็นพิเศษ",
    "textarea",
    undefined,
    true,
  ),
  profileField("applicant_signature", "ลงชื่อผู้สมัคร (พิมพ์ชื่อ - นามสกุล)"),
  profileField("application_date", "วันที่สมัคร", "date"),
].map((field, index) => ({
  ...field,
  page: 4,
  required: index < 10 || field.name === "profile.applicant_signature",
}));

const CORE_APPLICATION_FIELDS: ApplicationField[] = [
  {
    name: "full_name",
    label: "ชื่อ / นามสกุล (นาย / นาง / นางสาว)",
    type: "text",
    required: true,
    page: 1,
    maxLength: 160,
  },
  {
    name: "email",
    label: "อีเมล",
    type: "email",
    required: true,
    page: 1,
    maxLength: 254,
  },
  {
    name: "phone",
    label: "โทรศัพท์ / มือถือ",
    type: "tel",
    page: 1,
    maxLength: 40,
  },
  {
    name: "location",
    label: "จังหวัด / ที่อยู่ติดต่อ",
    type: "text",
    page: 1,
    maxLength: 120,
  },
  {
    name: "linkedin_url",
    label: "LinkedIn profile",
    type: "url",
    page: 1,
    maxLength: 500,
  },
  {
    name: "resume_url",
    label: "Resume / Portfolio URL",
    type: "url",
    page: 1,
    maxLength: 1000,
  },
];

const APPLICATION_PAGES = [
  {
    number: 1,
    title: "ใบสมัครงาน · ประวัติส่วนตัว",
    fields: [...CORE_APPLICATION_FIELDS, ...PAGE_ONE_FIELDS],
  },
  {
    number: 2,
    title: "ประวัติการศึกษา · ทักษะ · การฝึกงาน",
    fields: PAGE_TWO_FIELDS,
  },
  {
    number: 3,
    title: "ประวัติการทำงาน · ข้อมูลอื่น ๆ",
    fields: PAGE_THREE_FIELDS,
  },
  {
    number: 4,
    title: "บุคคลอ้างอิง · คำรับรองผู้สมัคร",
    fields: PAGE_FOUR_FIELDS,
  },
];

const applicationFieldSection = (page: number, name: string) => {
  if (page === 1) {
    if (
      /applicant_company|desired_position|salary_expectation|applicant_photo/.test(
        name,
      )
    )
      return "ตำแหน่งงานที่ต้องการสมัคร · เงินเดือน · รูปถ่าย";
    if (
      /father_|mother_|older_brothers|younger_brothers|older_sisters|younger_sisters|child_|spouse_|marital_status|living_with/.test(
        name,
      )
    )
      return "ข้อมูลครอบครัว";
    if (/address|phone|mobile|location/.test(name))
      return "ที่อยู่และช่องทางติดต่อ";
    if (
      /physical_status|disability|hospital_|tax_id|vision_|blood_type/.test(
        name,
      )
    )
      return "ข้อมูลสุขภาพและเอกสาร";
    if (
      /available_|travel_|overtime_|preferred_interview|application_source/.test(
        name,
      )
    )
      return "ความพร้อมในการทำงานและสัมภาษณ์";
    return "ประวัติส่วนตัว";
  }
  if (page === 2) {
    if (name.includes("education_activity_")) return "กิจกรรมระหว่างการศึกษา";
    if (name.includes("education_")) return "ประวัติการศึกษา";
    if (name.includes("language_")) return "ความรู้ภาษาต่างประเทศ";
    if (name.includes("emergency_"))
      return "กรณีฉุกเฉิน ติดต่อท่านไม่ได้ โปรดแจ้ง";
    if (name.includes("training_")) return "ผ่านการอบรม / สัมมนา";
    if (name.includes("internship_")) return "ประวัติการฝึกงาน / ดูงาน";
    return "ทักษะ ความรู้ และความสามารถพิเศษ";
  }
  if (page === 3) {
    if (name.startsWith("profile.work_"))
      return "ประวัติการทำงาน (ปัจจุบันและย้อนหลัง)";
    if (name.startsWith("profile.company_contact_"))
      return "ญาติ / คนรู้จักในบริษัท";
    if (name.endsWith("current_address_map")) return "แผนที่ที่อยู่ปัจจุบัน";
    return "ข้อมูลอื่น ๆ";
  }
  if (name.startsWith("profile.reference_")) return "บุคคลอ้างอิงที่ไม่ใช่ญาติ";
  return "คำชี้แจงและคำรับรองผู้สมัคร";
};

const ALL_APPLICATION_FIELDS = APPLICATION_PAGES.flatMap((page) => page.fields);

const collectApplicationEntries = (
  form: HTMLFormElement,
): {
  details: Record<string, string | string[]>;
  printable: PrintableEntry[];
} => {
  const data = new FormData(form);
  const details: Record<string, string | string[]> = {};
  const includeSensitive = data.get("sensitive_data_consent") === "on";
  const printable = ALL_APPLICATION_FIELDS.map((field) => {
    const values = data
      .getAll(field.name)
      .map((value) => String(value).trim())
      .filter(Boolean);
    const value = field.sensitive && !includeSensitive ? "" : values.join(", ");
    if (field.name.startsWith("profile.") && value) {
      details[field.name.slice("profile.".length)] =
        field.type === "checkboxes" ? values : value;
    }
    return {
      name: field.name,
      label: field.label,
      value,
      page: field.page,
    };
  });

  return { details, printable };
};

const inputClass =
  "mt-1.5 w-full rounded-lg border border-[#2A3548] bg-[#101926] px-3.5 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15";

const escapeApplicationHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });

export function PublicApplicationForm({
  jobCode,
  token,
}: {
  jobCode: string;
  token: string;
}) {
  const [job, setJob] = useState<PublicJob | null>(null);
  const [state, setState] = useState<ApplicationState>({ type: "loading" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRetryingNotification, setIsRetryingNotification] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [sensitiveDataConsent, setSensitiveDataConsent] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [printableEntries, setPrintableEntries] = useState<PrintableEntry[]>(
    [],
  );

  const renderApplicationField = (field: ApplicationField) => {
    if (field.sensitive && !sensitiveDataConsent) return null;
    const required = Boolean(field.required);
    const inputId = `application-${field.name.replace(/[^a-z0-9_-]/gi, "-")}`;
    const commonProps = {
      className: inputClass,
      id: inputId,
      maxLength: field.maxLength,
      name: field.name,
      required,
    };

    if (field.type === "checkboxes") {
      return (
        <fieldset
          className="text-xs text-slate-400 sm:col-span-2"
          key={field.name}
        >
          <legend>
            {field.label}
            {required && <span className="ml-1 text-rose-300">*</span>}
          </legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {field.options?.map((option) => (
              <label
                className="flex items-center gap-2 rounded-md border border-[#253044] px-3 py-2 text-xs text-slate-300"
                key={option}
              >
                <input
                  className="accent-emerald-500"
                  name={field.name}
                  type="checkbox"
                  value={option}
                />
                {option}
              </label>
            ))}
          </div>
        </fieldset>
      );
    }

    return (
      <label
        className={`text-xs text-slate-400 ${field.wide ? "sm:col-span-2" : ""}`}
        htmlFor={inputId}
        key={field.name}
      >
        {field.label}
        {required && <span className="ml-1 text-rose-300">*</span>}
        {field.type === "textarea" ? (
          <textarea {...commonProps} className={`${inputClass} min-h-20`} />
        ) : field.type === "select" ? (
          <select {...commonProps}>
            <option value="">เลือกคำตอบ</option>
            {field.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : (
          <input
            {...commonProps}
            min={field.type === "number" ? "0" : undefined}
            type={field.type}
          />
        )}
      </label>
    );
  };

  const goToApplicationPage = (nextPage: number, form: HTMLFormElement) => {
    if (nextPage > currentPage) {
      const currentPanel = form.querySelector<HTMLElement>(
        `[data-application-page="${currentPage}"]`,
      );
      const requiredFields = Array.from(
        currentPanel?.querySelectorAll<
          HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >("[required]") || [],
      );
      const firstInvalid = requiredFields.find(
        (field) => !field.checkValidity(),
      );
      if (firstInvalid) {
        firstInvalid.reportValidity();
        return;
      }
    }
    setCurrentPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const printApplication = (entries: PrintableEntry[]) => {
    setPrintableEntries(entries);
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.alert("อนุญาต popup เพื่อเปิดหน้าพิมพ์ใบสมัคร PDF");
      return;
    }
    const entryByName = new Map(entries.map((entry) => [entry.name, entry]));
    const pages = APPLICATION_PAGES.map((page) => {
      const fieldSections = new Map<string, ApplicationField[]>();
      page.fields.forEach((field) => {
        const section = applicationFieldSection(page.number, field.name);
        const sectionFields = fieldSections.get(section) || [];
        sectionFields.push(field);
        fieldSections.set(section, sectionFields);
      });
      const fields = Array.from(fieldSections.entries())
        .map(([section, sectionFields]) => {
          const renderedFields = sectionFields
            .map((field) => {
              const entry = entryByName.get(field.name);
              const classes = [
                "field",
                field.wide ? "wide" : "",
                field.name === "profile.current_address_map" ? "map-field" : "",
                field.type === "textarea" ? "textarea-field" : "",
              ]
                .filter(Boolean)
                .join(" ");
              return `<div class="${classes}"><span class="field-label">${escapeApplicationHtml(field.label)}</span><span class="field-value">${escapeApplicationHtml(entry?.value || "") || "&nbsp;"}</span></div>`;
            })
            .join("");
          return `<h2 class="section-heading">${escapeApplicationHtml(section)}</h2>${renderedFields}`;
        })
        .join("");
      const reference = entryByName.get("application_reference");
      const pageInstruction =
        page.number === 1
          ? `<p class="instructions">โปรดแนบรูปถ่ายจำนวน 2 รูป และเขียนชื่อ - นามสกุลด้านหลังรูปทุกรูป</p><p class="policy">บริษัทไม่รับผู้ที่สูบบุหรี่ โปรดอ่านเงื่อนไขการสมัครให้ครบถ้วน</p>`
          : page.number === 3
            ? `<p class="policy">โปรดอ่านและตอบข้อมูลอื่น ๆ ตามแบบฟอร์มบริษัท</p>`
            : page.number === 4
              ? `<p class="instructions">เขียนชื่อบุคคลที่ไม่ใช่ญาติอย่างน้อย 2 ท่าน ซึ่งทราบประวัติและความประพฤติของผู้สมัคร</p>`
              : "";
      const finalPage =
        page.number === 4
          ? `<div class="declaration"><strong>คำรับรองผู้สมัคร</strong><p>ข้าพเจ้ารับรองว่าข้อความในใบสมัครนี้เป็นความจริง สมบูรณ์ และถูกต้องตามที่ทราบ พร้อมยินยอมให้บริษัทตรวจสอบข้อมูลเพื่อประกอบการพิจารณารับเข้าทำงาน</p><p>ข้าพเจ้ารับทราบว่าระยะเวลาทดลองงานตามแบบฟอร์มบริษัทกำหนดไว้ 120 วัน</p></div><div class="signature">เลขที่ใบสมัคร: ${escapeApplicationHtml(reference?.value || "................................")}</div><div class="signature">ลงชื่อผู้สมัคร ............................................................ วันที่ ........../........../..........</div>`
          : "";
      return `<article class="application-page"><header><div class="company">บริษัท ริเวอร์โปร อินเตอร์เทรด จำกัด <span>FM-THR-24-002</span></div><h1>แบบใบสมัครงาน / Employment Application</h1><div class="job">ตำแหน่ง ${escapeApplicationHtml(job?.title || "")} · ${escapeApplicationHtml(job?.job_code || "")} · หน้า ${page.number} / 4</div></header>${pageInstruction}<div class="fields">${fields}</div>${finalPage}<footer>Riverpro Intertrade Co., Ltd. · FM-THR-24-002</footer></article>`;
    }).join("");
    printWindow.document.open();
    printWindow.document
      .write(`<!doctype html><html lang="th"><head><meta charset="utf-8"><title>ใบสมัครงาน ${escapeApplicationHtml(job?.job_code || "")}</title><style>
      @page { size: A4 portrait; margin: 8mm; }
      * { box-sizing: border-box; }
      body { margin: 0; color: #111827; font: 8pt/1.3 Arial, sans-serif; }
      .application-page { position: relative; height: 281mm; overflow: hidden; page-break-after: always; break-after: page; padding-bottom: 8mm; }
      .application-page:last-child { page-break-after: auto; break-after: auto; }
      header { border-bottom: 1.5pt solid #1e3a8a; padding-bottom: 3mm; margin-bottom: 3mm; }
      .company { display: flex; justify-content: space-between; color: #1e3a8a; font-weight: 700; }
      h1 { font-size: 15pt; text-align: center; margin: 2mm 0; }
      .job { font-weight: 700; font-size: 9pt; }
      .instructions { margin: 2mm 0; color: #374151; }
      .policy { margin: 1mm 0; color: #991b1b; font-weight: 700; }
      .fields { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .6mm 2mm; }
      .section-heading { grid-column: span 3; margin: .8mm 0 .2mm; color: #1e3a8a; font-size: 7pt; }
      .field { min-height: 5.2mm; border-bottom: .4pt dotted #64748b; padding: .4mm 0; overflow-wrap: anywhere; }
      .field.wide { grid-column: span 3; }
      .field-label { display: block; color: #1f2937; font-size: 6.4pt; font-weight: 700; line-height: 1.1; }
      .field-value { display: block; min-height: 2mm; white-space: pre-wrap; }
      .textarea-field .field-value { min-height: 5mm; }
      .map-field .field-value { min-height: 28mm; border: .5pt solid #94a3b8; margin-top: 1mm; }
      .declaration { margin-top: 2mm; border: .5pt solid #64748b; padding: 2mm; }
      .declaration p { margin: 1mm 0; }
      .signature { margin-top: 4mm; text-align: right; }
      footer { position: absolute; bottom: 1mm; left: 0; right: 0; border-top: .5pt solid #94a3b8; padding-top: 1mm; color: #64748b; text-align: right; font-size: 6pt; }
    </style></head><body>${pages}<script>window.onload=()=>{window.focus();window.print();window.onafterprint=()=>window.close();};</script></body></html>`);
    printWindow.document.close();
  };

  const sendApplicationNotification = async (
    targetJobCode: string,
    applicationCode: string,
    applicantEmail: string,
  ): Promise<{ error: string | null; applicationCode: string }> => {
    try {
      const response = await fetch("/api/ats/notify-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobCode: targetJobCode,
          token,
          applicationCode,
          applicantEmail,
        }),
      });
      const result = await response.json().catch(() => ({}));
      return {
        error: response.ok
          ? null
          : result.error || "ส่งอีเมลแจ้ง HR ไม่สำเร็จ กรุณาลองใหม่ภายหลัง",
        applicationCode: result.applicationCode || "",
      };
    } catch {
      return {
        error:
          "ส่งอีเมลแจ้ง HR ไม่สำเร็จเนื่องจากเชื่อมต่อระบบไม่ได้ กรุณาลองใหม่",
        applicationCode: "",
      };
    }
  };

  const retryApplicationNotification = async () => {
    if (state.type !== "success" || !job) return;
    setIsRetryingNotification(true);
    const notificationResult = await sendApplicationNotification(
      job.job_code,
      state.code,
      state.applicantEmail,
    );
    setState({
      type: "success",
      code: state.code,
      applicantEmail: state.applicantEmail,
      alreadySubmitted: state.alreadySubmitted,
      notificationError: notificationResult.error || undefined,
    });
    setIsRetryingNotification(false);
  };

  useEffect(() => {
    let isCurrent = true;
    const loadJob = async () => {
      if (!token || token.length < 48) {
        setState({
          type: "error",
          message: "ลิงก์สมัครงานไม่ถูกต้องหรือหมดอายุ กรุณาติดต่อผู้สรรหา",
        });
        return;
      }

      const { data, error } = await supabase.rpc("ats_get_public_job", {
        p_job_code: jobCode,
        p_token: token,
      });
      const publicJob = Array.isArray(data) ? data[0] : null;

      if (!isCurrent) return;
      if (error || !publicJob) {
        setState({
          type: "error",
          message: error?.message?.includes("function")
            ? "ระบบสมัครงานยังไม่พร้อมใช้งาน กรุณาติดต่อผู้สรรหา"
            : "ตำแหน่งนี้ปิดรับสมัครแล้ว หรือลิงก์สมัครงานไม่ถูกต้อง",
        });
        return;
      }

      setJob(publicJob as PublicJob);
      setState({ type: "idle" });
    };

    void loadJob();
    return () => {
      isCurrent = false;
    };
  }, [jobCode, token]);

  const submitApplication = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!job || !privacyConsent) return;

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const { details, printable } = collectApplicationEntries(formElement);
    setIsSubmitting(true);
    setState({ type: "idle" });

    try {
      const { data, error } = await supabase.rpc(
        "ats_submit_public_application",
        {
          p_job_code: job.job_code,
          p_token: token,
          p_full_name: String(form.get("full_name") || "").trim(),
          p_email: String(form.get("email") || "")
            .trim()
            .toLowerCase(),
          p_phone: String(form.get("phone") || "").trim(),
          p_location: String(form.get("location") || "").trim(),
          p_linkedin_url: String(form.get("linkedin_url") || "").trim(),
          p_resume_url: String(form.get("resume_url") || "").trim(),
          p_application_details: details,
          p_privacy_consent: privacyConsent,
          p_website: String(form.get("website") || ""),
        },
      );

      if (error) throw error;
      const applicationCode = data?.application_code || "";
      const applicantEmail = String(form.get("email") || "")
        .trim()
        .toLowerCase();
      const notificationResult = await sendApplicationNotification(
        job.job_code,
        applicationCode,
        applicantEmail,
      );
      setPrintableEntries([
        ...printable,
        {
          name: "application_reference",
          label: "เลขอ้างอิงใบสมัคร / Application reference",
          value: applicationCode,
          page: 4,
        },
      ]);
      setState({
        type: "success",
        code: applicationCode,
        applicantEmail,
        notificationError: notificationResult.error || undefined,
      });
      formElement.reset();
      setPrivacyConsent(false);
    } catch (error: any) {
      const message = error.message || "ส่งใบสมัครไม่สำเร็จ กรุณาลองอีกครั้ง";
      if (message.includes("already exists") && job) {
        const applicantEmail = String(form.get("email") || "")
          .trim()
          .toLowerCase();
        const notificationResult = await sendApplicationNotification(
          job.job_code,
          "",
          applicantEmail,
        );
        const applicationCode = notificationResult.applicationCode;
        setPrintableEntries([
          ...printable,
          {
            name: "application_reference",
            label: "เลขอ้างอิงใบสมัคร / Application reference",
            value: applicationCode,
            page: 4,
          },
        ]);
        setState({
          type: "success",
          code: applicationCode,
          applicantEmail,
          alreadySubmitted: true,
          notificationError: notificationResult.error || undefined,
        });
        return;
      }
      setState({
        type: "error",
        message: message.includes("already exists")
          ? "เราได้รับใบสมัครของคุณสำหรับตำแหน่งนี้แล้ว"
          : message.includes("invalid or expired")
            ? "ตำแหน่งนี้ปิดรับสมัครแล้ว หรือลิงก์สมัครงานไม่ถูกต้อง"
            : message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-linear-to-br from-[#0B0F19] via-[#111b2d] to-[#07383a] text-slate-200">
      <header className="border-b border-[#1E293B] bg-[#111726] px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <RiverproLogo />
          <ThemeToggle />
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-8 sm:px-6 sm:py-12">
        <div className="w-full max-w-3xl">
          {state.type === "loading" ? (
            <div className="flex min-h-72 items-center justify-center text-sm text-slate-400">
              <LoaderCircle className="mr-2 animate-spin" size={18} />{" "}
              กำลังโหลดรายละเอียดตำแหน่ง...
            </div>
          ) : state.type === "error" && !job ? (
            <div className="mx-auto max-w-xl rounded-xl border border-rose-500/20 bg-[#111926] p-6 text-center sm:p-9">
              <CircleAlert className="mx-auto mb-3 text-rose-300" size={24} />
              <h1 className="text-xl font-semibold text-white">
                ไม่สามารถเปิดใบสมัครได้
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {state.message}
              </p>
            </div>
          ) : state.type === "success" ? (
            <div className="mx-auto max-w-xl rounded-xl border border-emerald-500/20 bg-[#111926] p-6 text-center sm:p-9">
              <CheckCircle2
                className="mx-auto mb-4 text-emerald-300"
                size={30}
              />
              <p className="text-xs font-semibold uppercase text-emerald-300">
                Application received
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-white">
                ขอบคุณที่สมัครงานกับ Riverpro
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                {state.alreadySubmitted
                  ? "ระบบพบใบสมัครเดิมของคุณและจะส่งข้อมูลให้ทีมสรรหาตรวจสอบ"
                  : "ทีมสรรหาจะตรวจสอบใบสมัครและติดต่อกลับทางอีเมลหากมีขั้นตอนถัดไป"}
              </p>
              {state.code && (
                <p className="mt-5 font-mono text-xs text-slate-500">
                  Reference: {state.code}
                </p>
              )}
              {state.notificationError && (
                <div className="mt-5 rounded-lg border border-amber-500/25 bg-amber-500/10 p-4 text-left">
                  <p className="text-sm text-amber-200">
                    ใบสมัครบันทึกแล้ว แต่อีเมลแจ้ง HR ยังส่งไม่สำเร็จ:{" "}
                    {state.notificationError}
                  </p>
                  <button
                    className="mt-3 inline-flex items-center gap-2 rounded-lg border border-amber-400/30 px-3 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-400/10 disabled:opacity-50"
                    disabled={isRetryingNotification}
                    onClick={() => void retryApplicationNotification()}
                    type="button"
                  >
                    {isRetryingNotification ? (
                      <LoaderCircle className="animate-spin" size={14} />
                    ) : (
                      <Send size={14} />
                    )}
                    {isRetryingNotification
                      ? "กำลังลองส่ง..."
                      : "ลองส่งอีเมลแจ้ง HR อีกครั้ง"}
                  </button>
                </div>
              )}
              {printableEntries.length > 0 && (
                <button
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-[#06120D] hover:bg-emerald-300"
                  onClick={() => printApplication(printableEntries)}
                  type="button"
                >
                  <Download size={16} /> พิมพ์ / บันทึกใบสมัคร PDF
                </button>
              )}
            </div>
          ) : job ? (
            <div className="overflow-hidden rounded-xl border border-[#253044] bg-[#111926]/90">
              <div className="border-b border-[#253044] bg-[#101A28] px-5 py-6 sm:px-8">
                <p className="text-xs font-semibold uppercase text-emerald-300">
                  Careers · {job.job_code}
                </p>
                <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
                  {job.title}
                </h1>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-400">
                  {job.department && <span>{job.department}</span>}
                  {job.location && <span>{job.location}</span>}
                  {job.employment_type && <span>{job.employment_type}</span>}
                  {job.close_date && (
                    <span>
                      Apply by{" "}
                      {new Date(
                        `${job.close_date}T00:00:00`,
                      ).toLocaleDateString("en-GB")}
                    </span>
                  )}
                </div>
              </div>

              <form
                className="space-y-5 p-5 sm:p-8"
                onSubmit={(event) => void submitApplication(event)}
              >
                {state.type === "error" && (
                  <div
                    className="flex items-start gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-200"
                    role="alert"
                  >
                    <CircleAlert className="mt-0.5 shrink-0" size={16} />{" "}
                    {state.message}
                  </div>
                )}

                <label
                  aria-hidden="true"
                  className="absolute -left-2500 top-auto h-px w-px overflow-hidden"
                  htmlFor="application-website"
                >
                  Website
                  <input
                    autoComplete="off"
                    id="application-website"
                    name="website"
                    tabIndex={-1}
                  />
                </label>

                <ol
                  aria-label="ลำดับหน้าใบสมัคร"
                  className="grid grid-cols-4 gap-2"
                >
                  {APPLICATION_PAGES.map((page) => (
                    <li key={page.number}>
                      <button
                        aria-current={
                          currentPage === page.number ? "step" : undefined
                        }
                        className={`w-full border-b-2 px-1 pb-2 text-left text-[10px] font-semibold sm:text-xs ${currentPage === page.number ? "border-emerald-400 text-emerald-200" : page.number < currentPage ? "border-emerald-800 text-slate-400" : "border-[#253044] text-slate-500"}`}
                        disabled={page.number > currentPage}
                        onClick={() => setCurrentPage(page.number)}
                        type="button"
                      >
                        P.{page.number}
                        <span className="hidden sm:inline"> {page.title}</span>
                      </button>
                    </li>
                  ))}
                </ol>

                {APPLICATION_PAGES.map((page) => (
                  <section
                    className="space-y-5"
                    data-application-page={page.number}
                    hidden={currentPage !== page.number}
                    key={page.number}
                  >
                    <header className="border-b border-[#253044] pb-3">
                      <p className="text-[10px] font-bold uppercase text-emerald-300">
                        FM-THR-24-002 · P.{page.number}
                      </p>
                      <h2 className="mt-1 text-lg font-semibold text-white">
                        {page.title}
                      </h2>
                      <p className="mt-1 text-xs text-slate-500">
                        ตำแหน่ง: {job.title} · {job.job_code}
                      </p>
                    </header>
                    {page.number === 1 && (
                      <>
                        <div className="rounded-md border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-5 text-amber-100">
                          โปรดกรอกข้อมูลตามความเป็นจริง และอ่านคำรับรองในหน้า 4
                          ก่อนส่งใบสมัคร
                        </div>
                        <div className="rounded-md border border-rose-500/20 bg-rose-500/5 p-3 text-xs leading-5 text-rose-100">
                          ประกาศบริษัทตามแบบฟอร์ม: บริษัทไม่รับผู้ที่สูบบุหรี่
                          โปรดอ่านเงื่อนไขการสมัครให้ครบถ้วนก่อนส่งใบสมัคร
                        </div>
                        <label className="flex items-start gap-3 rounded-md border border-[#2A3548] bg-[#0D1520] p-3 text-xs leading-5 text-slate-300">
                          <input
                            checked={sensitiveDataConsent}
                            className="mt-1 accent-emerald-500"
                            name="sensitive_data_consent"
                            onChange={(event) =>
                              setSensitiveDataConsent(event.target.checked)
                            }
                            type="checkbox"
                          />
                          <span>
                            ยินยอมให้กรอกและส่งข้อมูลส่วนบุคคลที่มีความอ่อนไหวตามที่ระบุในแบบฟอร์มโดยสมัครใจ
                            หากไม่ยินยอมสามารถเว้นข้อมูลดังกล่าวได้
                          </span>
                        </label>
                      </>
                    )}
                    {Array.from(
                      page.fields.reduce((sections, field) => {
                        const section = applicationFieldSection(
                          page.number,
                          field.name,
                        );
                        sections.set(section, [
                          ...(sections.get(section) || []),
                          field,
                        ]);
                        return sections;
                      }, new Map<string, ApplicationField[]>()),
                    ).map(([section, fields]) => (
                      <section className="space-y-3" key={section}>
                        <h3 className="border-b border-[#253044] pb-2 text-sm font-semibold text-emerald-200">
                          {section}
                        </h3>
                        <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
                          {fields.map(renderApplicationField)}
                        </div>
                      </section>
                    ))}
                    {page.number === 3 && (
                      <div className="rounded-md border border-rose-500/20 bg-rose-500/5 p-3 text-xs leading-5 text-rose-100">
                        ตามแบบฟอร์มบริษัทระบุเงื่อนไขเกี่ยวกับการสูบบุหรี่และการจ้างงาน
                        โปรดพิจารณาประกาศบริษัทก่อนให้ข้อมูลส่วนนี้
                      </div>
                    )}
                    {page.number === 4 && (
                      <>
                        <div className="space-y-2 rounded-md border border-[#2A3548] bg-[#0D1520] p-4 text-xs leading-5 text-slate-300">
                          <h3 className="font-semibold text-white">
                            คำเตือนและคำรับรองผู้สมัคร
                          </h3>
                          <p>
                            ข้าพเจ้ารับรองว่าข้อมูลในใบสมัครนี้เป็นความจริงและครบถ้วน
                            หากมีการปกปิดหรือให้ข้อมูลอันเป็นเท็จ
                            บริษัทอาจยุติการพิจารณาตามระเบียบที่เกี่ยวข้อง
                          </p>
                          <p>
                            การให้ข้อมูลส่วนบุคคลเป็นไปตามประกาศความเป็นส่วนตัวสำหรับผู้สมัครงานของบริษัท
                            และผู้สมัครสามารถติดต่อบริษัทเพื่อใช้สิทธิตามกฎหมายคุ้มครองข้อมูลส่วนบุคคลได้
                          </p>
                        </div>
                        <label className="flex items-start gap-3 rounded-md border border-[#2A3548] bg-[#0D1520] p-4 text-xs leading-5 text-slate-300">
                          <input
                            checked={privacyConsent}
                            className="mt-1 accent-emerald-500"
                            name="privacy_consent"
                            onChange={(event) =>
                              setPrivacyConsent(event.target.checked)
                            }
                            required
                            type="checkbox"
                          />
                          <span>
                            ข้าพเจ้าได้อ่านและยินยอมให้บริษัทใช้ข้อมูลเพื่อพิจารณาการสมัครงานตามประกาศความเป็นส่วนตัวแล้ว{" "}
                            <span className="text-rose-300">*</span>
                          </span>
                        </label>
                      </>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#253044] pt-4">
                      <button
                        className="rounded-lg border border-[#40516b] px-4 py-2.5 text-sm font-semibold text-slate-200 disabled:opacity-40"
                        disabled={page.number === 1}
                        onClick={() =>
                          setCurrentPage((current) => Math.max(1, current - 1))
                        }
                        type="button"
                      >
                        ย้อนกลับ
                      </button>
                      {page.number < 4 ? (
                        <button
                          className="rounded-lg bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-[#06120D]"
                          onClick={(event) => {
                            const form = event.currentTarget.form;
                            if (form)
                              goToApplicationPage(page.number + 1, form);
                          }}
                          type="button"
                        >
                          ถัดไป · หน้า {page.number + 1}
                        </button>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="inline-flex items-center gap-2 rounded-lg border border-[#40516b] px-4 py-2.5 text-sm font-semibold text-slate-200"
                            onClick={(event) => {
                              const form = event.currentTarget.form;
                              if (form)
                                printApplication(
                                  collectApplicationEntries(form).printable,
                                );
                            }}
                            type="button"
                          >
                            <Download size={15} /> พิมพ์ / บันทึก PDF
                          </button>
                          <button
                            className="inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-[#06120D] disabled:opacity-50"
                            disabled={!privacyConsent || isSubmitting}
                            type="submit"
                          >
                            {isSubmitting ? (
                              <LoaderCircle
                                className="animate-spin"
                                size={15}
                              />
                            ) : (
                              <Send size={15} />
                            )}
                            ส่งใบสมัคร
                          </button>
                        </div>
                      )}
                    </div>
                  </section>
                ))}

                <fieldset aria-hidden="true" className="hidden" disabled>
                  <section className="space-y-4">
                    <div>
                      <h2 className="text-base font-semibold text-white">
                        1. ข้อมูลส่วนตัวและตำแหน่งที่สมัคร
                      </h2>
                      <p className="mt-1 text-xs text-slate-500">
                        กรอกข้อมูลติดต่อ ประวัติที่เกี่ยวข้อง
                        และความพร้อมในการทำงาน
                      </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="text-sm text-slate-300 sm:col-span-2">
                        ชื่อ - นามสกุล / Full name{" "}
                        <span className="text-rose-300">*</span>
                        <input
                          autoComplete="name"
                          className={inputClass}
                          maxLength={160}
                          name="full_name"
                          required
                        />
                      </label>
                      <label className="text-sm text-slate-300">
                        อีเมล / Email <span className="text-rose-300">*</span>
                        <input
                          autoComplete="email"
                          className={inputClass}
                          maxLength={254}
                          name="email"
                          required
                          type="email"
                        />
                      </label>
                      <label className="text-sm text-slate-300">
                        โทรศัพท์ / Phone
                        <input
                          autoComplete="tel"
                          className={inputClass}
                          maxLength={40}
                          name="phone"
                          type="tel"
                        />
                      </label>
                      <label className="text-sm text-slate-300">
                        ที่อยู่ปัจจุบัน / จังหวัด
                        <input
                          autoComplete="address-level2"
                          className={inputClass}
                          maxLength={120}
                          name="location"
                        />
                      </label>
                      <label className="text-sm text-slate-300">
                        LinkedIn profile
                        <input
                          className={inputClass}
                          maxLength={500}
                          name="linkedin_url"
                          placeholder="https://www.linkedin.com/in/..."
                          type="url"
                        />
                      </label>
                      <label className="text-sm text-slate-300 sm:col-span-2">
                        Resume / Portfolio URL
                        <input
                          className={inputClass}
                          maxLength={1000}
                          name="resume_url"
                          placeholder="https://..."
                          type="url"
                        />
                      </label>
                      <label className="text-sm text-slate-300">
                        ตำแหน่งที่ต้องการสมัคร ลำดับ 1
                        <input
                          className={inputClass}
                          maxLength={160}
                          name="profile.desired_position_1"
                        />
                      </label>
                      <label className="text-sm text-slate-300">
                        ตำแหน่งที่ต้องการสมัคร ลำดับ 2
                        <input
                          className={inputClass}
                          maxLength={160}
                          name="profile.desired_position_2"
                        />
                      </label>
                      <label className="text-sm text-slate-300">
                        เงินเดือนที่ต้องการ (บาท)
                        <input
                          className={inputClass}
                          min="0"
                          name="profile.salary_expectation"
                          type="number"
                        />
                      </label>
                      <label className="text-sm text-slate-300">
                        วันที่พร้อมเริ่มงาน
                        <input
                          className={inputClass}
                          name="profile.available_from"
                          type="date"
                        />
                      </label>
                      <label className="text-sm text-slate-300">
                        สามารถปฏิบัติงานต่างจังหวัดได้
                        <select
                          className={inputClass}
                          name="profile.travel_availability"
                        >
                          <option value="">เลือกคำตอบ</option>
                          <option>ได้</option>
                          <option>ไม่ได้</option>
                        </select>
                      </label>
                      <label className="text-sm text-slate-300">
                        สามารถทำงานล่วงเวลาได้
                        <select
                          className={inputClass}
                          name="profile.overtime_availability"
                        >
                          <option value="">เลือกคำตอบ</option>
                          <option>ได้</option>
                          <option>ไม่ได้</option>
                        </select>
                      </label>
                      <label className="text-sm text-slate-300">
                        ช่องทางสัมภาษณ์ที่สะดวก
                        <select
                          className={inputClass}
                          name="profile.preferred_interview_channel"
                        >
                          <option value="">เลือกช่องทาง</option>
                          <option>ออนไลน์ (Video call)</option>
                          <option>โทรศัพท์</option>
                          <option>สัมภาษณ์ที่บริษัท</option>
                          <option>อื่น ๆ / ขอหารือกับผู้สรรหา</option>
                        </select>
                      </label>
                      <label className="text-sm text-slate-300 sm:col-span-2">
                        วันและเวลาที่สะดวกสำหรับสัมภาษณ์
                        <input
                          className={inputClass}
                          maxLength={300}
                          name="profile.preferred_interview_times"
                          placeholder="เช่น วันจันทร์-ศุกร์ หลัง 13:00 น."
                        />
                      </label>
                    </div>
                  </section>

                  <section className="space-y-4 border-t border-[#253044] pt-5">
                    <h2 className="text-base font-semibold text-white">
                      2. ประวัติการศึกษา
                    </h2>
                    {[1, 2, 3].map((row) => (
                      <div
                        className="grid gap-3 rounded-lg border border-[#253044] p-3 sm:grid-cols-3"
                        key={row}
                      >
                        <p className="text-xs font-semibold text-emerald-300 sm:col-span-3">
                          วุฒิการศึกษาลำดับ {row}
                        </p>
                        {[
                          ["ระดับการศึกษา", "level"],
                          ["สถานศึกษา", "school"],
                          ["จังหวัด", "province"],
                          ["ปีที่จบ", "graduation_year"],
                          ["สาขาวิชา", "major"],
                          ["เกรดเฉลี่ย", "gpa"],
                        ].map(([label, field]) => (
                          <label className="text-xs text-slate-400" key={field}>
                            {label}
                            <input
                              className={inputClass}
                              maxLength={120}
                              name={`profile.education_${row}_${field}`}
                            />
                          </label>
                        ))}
                      </div>
                    ))}
                  </section>

                  <section className="space-y-4 border-t border-[#253044] pt-5">
                    <h2 className="text-base font-semibold text-white">
                      3. ภาษาและทักษะ
                    </h2>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {["ภาษาอังกฤษ", "ภาษาญี่ปุ่น", "ภาษาจีน"].map(
                        (language, index) => (
                          <label
                            className="text-sm text-slate-300"
                            key={language}
                          >
                            {language}
                            <select
                              className={inputClass}
                              name={`profile.language_${index + 1}`}
                            >
                              <option value="">เลือกระดับความสามารถ</option>
                              <option>ดี</option>
                              <option>ปานกลาง</option>
                              <option>พื้นฐาน</option>
                            </select>
                          </label>
                        ),
                      )}
                      <label className="text-sm text-slate-300">
                        โปรแกรมคอมพิวเตอร์ที่ใช้ได้
                        <input
                          className={inputClass}
                          maxLength={300}
                          name="profile.computer_skills"
                        />
                      </label>
                      <label className="text-sm text-slate-300">
                        ทักษะอื่น ๆ / ความสามารถพิเศษ
                        <input
                          className={inputClass}
                          maxLength={300}
                          name="profile.other_skills"
                        />
                      </label>
                      <label className="text-sm text-slate-300">
                        ความเร็วพิมพ์ภาษาไทย (คำ/นาที)
                        <input
                          className={inputClass}
                          min="0"
                          name="profile.typing_thai"
                          type="number"
                        />
                      </label>
                      <label className="text-sm text-slate-300">
                        ความเร็วพิมพ์ภาษาอังกฤษ (คำ/นาที)
                        <input
                          className={inputClass}
                          min="0"
                          name="profile.typing_english"
                          type="number"
                        />
                      </label>
                      <label className="text-sm text-slate-300">
                        ใบอนุญาตขับขี่ / ประเภท
                        <input
                          className={inputClass}
                          maxLength={120}
                          name="profile.driving_license"
                        />
                      </label>
                      <label className="text-sm text-slate-300">
                        ประสบการณ์ขับรถโฟร์คลิฟท์
                        <input
                          className={inputClass}
                          maxLength={120}
                          name="profile.forklift_experience"
                        />
                      </label>
                    </div>
                  </section>

                  <section className="space-y-4 border-t border-[#253044] pt-5">
                    <h2 className="text-base font-semibold text-white">
                      4. ประสบการณ์ทำงานและการฝึกงาน
                    </h2>
                    {[1, 2, 3].map((row) => (
                      <div
                        className="grid gap-3 rounded-lg border border-[#253044] p-3 sm:grid-cols-2"
                        key={row}
                      >
                        <p className="text-xs font-semibold text-emerald-300 sm:col-span-2">
                          ประวัติการทำงานลำดับ {row}
                        </p>
                        {[
                          ["บริษัท", "company"],
                          ["ตำแหน่ง", "position"],
                          ["ช่วงเวลาทำงาน", "period"],
                          ["จังหวัด", "province"],
                          ["หน้าที่รับผิดชอบ", "responsibilities"],
                          ["เหตุผลที่ออก", "reason_for_leaving"],
                        ].map(([label, field]) => (
                          <label className="text-xs text-slate-400" key={field}>
                            {label}
                            <input
                              className={inputClass}
                              maxLength={300}
                              name={`profile.work_${row}_${field}`}
                            />
                          </label>
                        ))}
                      </div>
                    ))}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="text-sm text-slate-300">
                        ประวัติการฝึกงาน / ดูงาน
                        <textarea
                          className={`${inputClass} min-h-24`}
                          maxLength={2000}
                          name="profile.internship_history"
                        />
                      </label>
                      <label className="text-sm text-slate-300">
                        กิจกรรมระหว่างการศึกษา / งานอดิเรก
                        <textarea
                          className={`${inputClass} min-h-24`}
                          maxLength={2000}
                          name="profile.activities"
                        />
                      </label>
                      <label className="text-sm text-slate-300 sm:col-span-2">
                        การอบรม / สัมมนา (หลักสูตร หน่วยงาน และปีที่อบรม)
                        <textarea
                          className={`${inputClass} min-h-24`}
                          maxLength={2000}
                          name="profile.training_history"
                        />
                      </label>
                    </div>
                  </section>

                  <section className="space-y-4 border-t border-[#253044] pt-5">
                    <h2 className="text-base font-semibold text-white">
                      5. ผู้ติดต่อกรณีฉุกเฉินและบุคคลอ้างอิง
                    </h2>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[1, 2].map((row) => (
                        <div
                          className="grid gap-3 rounded-lg border border-[#253044] p-3"
                          key={row}
                        >
                          <p className="text-xs font-semibold text-emerald-300">
                            ผู้ติดต่อ {row}
                          </p>
                          <input
                            aria-label={`ชื่อผู้ติดต่อ ${row}`}
                            className={inputClass}
                            maxLength={160}
                            name={`profile.contact_${row}_name`}
                            placeholder="ชื่อ - นามสกุล"
                          />
                          <input
                            aria-label={`ความสัมพันธ์ผู้ติดต่อ ${row}`}
                            className={inputClass}
                            maxLength={80}
                            name={`profile.contact_${row}_relationship`}
                            placeholder="ความสัมพันธ์"
                          />
                          <input
                            aria-label={`โทรศัพท์ผู้ติดต่อ ${row}`}
                            className={inputClass}
                            maxLength={40}
                            name={`profile.contact_${row}_phone`}
                            placeholder="โทรศัพท์"
                            type="tel"
                          />
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-3 border-t border-[#253044] pt-5">
                    <h2 className="text-base font-semibold text-white">
                      6. ข้อมูลเพิ่มเติม
                    </h2>
                    <label className="block text-sm text-slate-300">
                      ข้อมูลหรือคำชี้แจงเพิ่มเติมสำหรับผู้สรรหา
                      <textarea
                        className={`${inputClass} min-h-28`}
                        maxLength={3000}
                        name="profile.additional_information"
                      />
                    </label>
                  </section>

                  <label
                    aria-hidden="true"
                    className="absolute -left-2500 top-auto h-px w-px overflow-hidden"
                    htmlFor="website"
                  >
                    Website
                    <input
                      autoComplete="off"
                      id="website"
                      name="website"
                      tabIndex={-1}
                    />
                  </label>

                  <section className="rounded-lg border border-[#2A3548] bg-[#0D1520] p-4">
                    <label className="flex items-start gap-3 text-xs leading-5 text-slate-300">
                      <input
                        checked={privacyConsent}
                        className="mt-1 accent-emerald-500"
                        onChange={(event) =>
                          setPrivacyConsent(event.target.checked)
                        }
                        required
                        type="checkbox"
                      />
                      <span>
                        I have read the privacy notice and consent to Riverpro
                        processing my personal data for recruitment and this job
                        application. <span className="text-rose-300">*</span>
                      </span>
                    </label>
                    <p className="ml-7 mt-2 text-[11px] leading-5 text-slate-500">
                      You may request access, correction, or withdrawal of
                      consent through the recruitment team.
                    </p>
                  </section>

                  <div className="flex flex-col-reverse gap-3 border-t border-[#253044] pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-slate-500">
                      ข้อมูลสุขภาพ เลขประจำตัวประชาชน
                      และข้อมูลครอบครัวจะไม่ถูกร้องขอในขั้นตอนสมัครออนไลน์
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#40516b] px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-white/5"
                        onClick={(event) => {
                          const formElement = event.currentTarget.form;
                          if (formElement)
                            printApplication(
                              collectApplicationEntries(formElement).printable,
                            );
                        }}
                        type="button"
                      >
                        <Download size={15} /> พิมพ์ / บันทึก PDF
                      </button>
                      <button
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-400 px-5 py-3 text-sm font-semibold text-[#06120D] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={!privacyConsent || isSubmitting}
                        type="submit"
                      >
                        {isSubmitting ? (
                          <LoaderCircle className="animate-spin" size={16} />
                        ) : (
                          <Send size={15} />
                        )}
                        {isSubmitting ? "กำลังส่ง..." : "ส่งใบสมัคร"}
                      </button>
                    </div>
                  </div>
                </fieldset>
              </form>
            </div>
          ) : null}
        </div>
      </main>

      {printableEntries.length > 0 && (
        <section id="application-print-sheet" aria-hidden="true">
          <h1>ใบสมัครงาน / Employment Application</h1>
          <h2>
            {job?.title || "Riverpro"} · {job?.job_code}
          </h2>
          <p>บริษัท ริเวอร์โปร อินเตอร์เทรด จำกัด</p>
          <table>
            <tbody>
              {printableEntries.map((entry) => (
                <tr key={entry.label}>
                  <th>{entry.label}</th>
                  <td>{entry.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="application-print-signature">
            ลงชื่อผู้สมัคร
            ............................................................ วันที่
            ........../........../..........
          </p>
        </section>
      )}

      <footer className="border-t border-[#1E293B] bg-[#0B0F19] px-5 py-5 text-slate-500 sm:px-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <RiverproLogo compact />
          <p className="text-xs">
            © {new Date().getFullYear()} Riverpro Intertrade Co., Ltd.
          </p>
        </div>
      </footer>
    </div>
  );
}
