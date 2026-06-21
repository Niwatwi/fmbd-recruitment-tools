"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Swal from "sweetalert2";
import {
  Users,
  RefreshCw,
  Calendar,
  Download,
  Plus,
  Trash2,
  Copy,
  ChevronDown,
  ChevronUp,
  Search,
  LogOut,
  Sun,
  Moon,
  Trophy,
  ArrowUpDown,
  Building2,
  Mail,
  ShieldCheck,
  FileText,
  Save,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

// 🎨 Palette สีมาตรฐานสำหรับวงจรชีวิตกำลังพล
const STATUS_COLORS = {
  ปกติ: "#10b981",
  รอลงงาน: "#38bdf8",
  ระงับการใช้งาน: "#64748b",
  สรรหา: "#f59e0b",
  แจ้งลาออก: "#f43f5e",
};

const TYPE_COLORS = {
  BA: "#10b981",
  COM: "#f59e0b",
  KOE: "#3b82f6",
  MER: "#ea580c",
};

const MONTH_NAMES: any = {
  "1": "January",
  "2": "February",
  "3": "March",
  "4": "April",
  "5": "May",
  "6": "June",
  "7": "July",
  "8": "August",
  "9": "September",
  "10": "October",
  "11": "November",
  "12": "December",
};

export default function CompleteManpowerWarRoom() {
  const router = useRouter();
  const [rawData, setRawData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSavingTarget, setIsSavingTarget] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // 🌐 กลุ่มควบคุมฟิลเตอร์หลักด้านบนสุด
  const [filterYear, setFilterYear] = useState("All Year");
  const [filterMonth, setFilterMonth] = useState("All Month");
  const [filterArea, setFilterArea] = useState("All Area");
  const [filterAreaCode, setFilterAreaCode] = useState("All Area Code");
  const [filterRole, setFilterRole] = useState("All Role");
  const [filterEmpType, setFilterEmpType] = useState("All Employee Type");
  const [filterStatus, setFilterStatus] = useState("All Status");
  const [dateFrom, setDateFrom] = useState("2026-02-20");
  const [dateTo, setDateTo] = useState("2026-06-21");

  const [chartMode, setChartMode] = useState<"percent" | "count">("percent");
  const [searchTableTerm, setSearchTableTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<string>("date_stamp");
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const rowsPerPage = 10;

  // 🎯 คลังข้อมูลเป้าหมายพนักงาน (มีค่าดีฟอลต์สำรองรองรับ)
  const [areaTargets, setAreaTargets] = useState<any[]>([
    {
      id: "K01",
      name: "K01",
      open: true,
      plan: { KOE: 1, MER: 17, COM: 0, BA: 1 },
      approve: { KOE: 1, MER: 17, COM: 0, BA: 1 },
    },
    {
      id: "K02",
      name: "K02",
      open: true,
      plan: { KOE: 1, MER: 4, COM: 0, BA: 1 },
      approve: { KOE: 1, MER: 2, COM: 0, BA: 1 },
    },
    {
      id: "K03",
      name: "K03",
      open: false,
      plan: { KOE: 2, MER: 10, COM: 1, BA: 2 },
      approve: { KOE: 1, MER: 8, COM: 1, BA: 2 },
    },
    {
      id: "K04",
      name: "K04",
      open: false,
      plan: { KOE: 1, MER: 12, COM: 0, BA: 1 },
      approve: { KOE: 1, MER: 10, COM: 0, BA: 1 },
    },
    {
      id: "K05",
      name: "K05",
      open: false,
      plan: { KOE: 1, MER: 8, COM: 1, BA: 1 },
      approve: { KOE: 1, MER: 7, COM: 1, BA: 1 },
    },
    {
      id: "K06",
      name: "K06",
      open: false,
      plan: { KOE: 2, MER: 15, COM: 1, BA: 2 },
      approve: { KOE: 1, MER: 12, COM: 1, BA: 2 },
    },
    {
      id: "K07",
      name: "K07",
      open: false,
      plan: { KOE: 1, MER: 11, COM: 1, BA: 1 },
      approve: { KOE: 1, MER: 9, COM: 1, BA: 1 },
    },
    {
      id: "K08",
      name: "K08",
      open: false,
      plan: { KOE: 1, MER: 10, COM: 0, BA: 1 },
      approve: { KOE: 1, MER: 10, COM: 0, BA: 1 },
    },
  ]);
  const [selectedAreaInput, setSelectedAreaInput] = useState("");

  // 🔄 ฟังก์ชันโหลดข้อมูลหลัก
  const fetchWarRoomDatabase = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("data_app").select("*");
      if (error) throw error;
      if (data) setRawData(data);

      const { data: targetsData, error: targetsError } = await supabase
        .from("area_targets")
        .select("*");

      if (!targetsError && targetsData && targetsData.length > 0) {
        const baseMap: Record<string, any> = {
          K01: {
            id: "K01",
            name: "K01",
            open: false,
            plan: { KOE: 0, MER: 0, COM: 0, BA: 0 },
            approve: { KOE: 0, MER: 0, COM: 0, BA: 0 },
          },
          K02: {
            id: "K02",
            name: "K02",
            open: false,
            plan: { KOE: 0, MER: 0, COM: 0, BA: 0 },
            approve: { KOE: 0, MER: 0, COM: 0, BA: 0 },
          },
          K03: {
            id: "K03",
            name: "K03",
            open: false,
            plan: { KOE: 0, MER: 0, COM: 0, BA: 0 },
            approve: { KOE: 0, MER: 0, COM: 0, BA: 0 },
          },
          K04: {
            id: "K04",
            name: "K04",
            open: false,
            plan: { KOE: 0, MER: 0, COM: 0, BA: 0 },
            approve: { KOE: 0, MER: 0, COM: 0, BA: 0 },
          },
          K05: {
            id: "K05",
            name: "K05",
            open: false,
            plan: { KOE: 0, MER: 0, COM: 0, BA: 0 },
            approve: { KOE: 0, MER: 0, COM: 0, BA: 0 },
          },
          K06: {
            id: "K06",
            name: "K06",
            open: false,
            plan: { KOE: 0, MER: 0, COM: 0, BA: 0 },
            approve: { KOE: 0, MER: 0, COM: 0, BA: 0 },
          },
          K07: {
            id: "K07",
            name: "K07",
            open: false,
            plan: { KOE: 0, MER: 0, COM: 0, BA: 0 },
            approve: { KOE: 0, MER: 0, COM: 0, BA: 0 },
          },
          K08: {
            id: "K08",
            name: "K08",
            open: false,
            plan: { KOE: 0, MER: 0, COM: 0, BA: 0 },
            approve: { KOE: 0, MER: 0, COM: 0, BA: 0 },
          },
        };

        targetsData.forEach((row: any) => {
          const areaKey = row.area
            ? row.area.toString().trim().toUpperCase()
            : "";
          const roleKey = row.role
            ? row.role.toString().trim().toUpperCase()
            : "";
          const approveValue = row.target_approve || 0;

          if (baseMap[areaKey]) {
            baseMap[areaKey].approve[roleKey] = approveValue;
            baseMap[areaKey].plan[roleKey] = approveValue;
          }
        });
        setAreaTargets(Object.values(baseMap));
      }
    } catch (err: any) {
      console.error("ฐานข้อมูลขัดข้อง:", err);
    } finally {
      setLoading(false);
    }
  };

  // 💾 ฟังก์ชันยิงบันทึกค่าโควตาลงฐานข้อมูล Supabase
  const handleSaveTargetsToSupabase = async () => {
    setIsSavingTarget(true);
    try {
      const rowsToUpsert: any[] = [];
      areaTargets.forEach((areaItem) => {
        ["KOE", "MER", "COM", "BA"].forEach((roleKey) => {
          rowsToUpsert.push({
            area: areaItem.name.trim(),
            role: roleKey,
            target_approve: areaItem.approve[roleKey] || 0,
          });
        });
      });

      const { error } = await supabase
        .from("area_targets")
        .upsert(rowsToUpsert, { onConflict: "area,role" });

      if (error) throw error;

      Swal.fire({
        icon: "success",
        title: "บันทึกโควตาสำเร็จ!",
        text: "ข้อมูลกรอบกำลังพลถูกอัปเดตและซิงค์ไปหน้าห้องคะแนน KPI เรียบร้อยแล้วครับพี่!",
        background: isDarkMode ? "#0B132B" : "#ffffff",
        color: isDarkMode ? "#f8fafc" : "#1e293b",
        confirmButtonColor: "#10b981",
      });
    } catch (err: any) {
      console.error("เซฟข้อมูลเป้าหมายพัง:", err);
      Swal.fire({
        icon: "error",
        title: "บันทึกข้อมูลล้มเหลว",
        text:
          err.message ||
          "เกิดปัญหาขัดข้องเกี่ยวกับการยืนยันสิทธิ์เข้าตาราง area_targets",
        background: isDarkMode ? "#0B132B" : "#ffffff",
        color: isDarkMode ? "#f8fafc" : "#1e293b",
      });
    } finally {
      setIsSavingTarget(false);
    }
  };

  useEffect(() => {
    fetchWarRoomDatabase();
    setMounted(true);

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    setDateTo(`${yyyy}-${mm}-${dd}`);
  }, []);

  // 📊 UseMemo รวบรวมฟิลเตอร์
  const availableYears = useMemo(
    () => [
      "All Year",
      ...Array.from(
        new Set(rawData.map((d) => d.year_num?.toString()).filter(Boolean)),
      ),
    ],
    [rawData],
  );

  const availableMonths = useMemo(
    () => [
      "All Month",
      ...Array.from(
        new Set(rawData.map((d) => d.month_num?.toString()).filter(Boolean)),
      ),
    ],
    [rawData],
  );

  const availableAreas = useMemo(
    () => [
      "All Area",
      ...Array.from(new Set(rawData.map((d) => d.area).filter(Boolean))),
    ],
    [rawData],
  );

  const availableAreaCodes = useMemo(
    () => [
      "All Area Code",
      ...Array.from(new Set(rawData.map((d) => d.area_code).filter(Boolean))),
    ],
    [rawData],
  );

  const handleClearAllFilters = () => {
    setFilterYear("All Year");
    setFilterMonth("All Month");
    setFilterArea("All Area");
    setFilterAreaCode("All Area Code");
    setFilterRole("All Role");
    setFilterEmpType("All Employee Type");
    setFilterStatus("All Status");
    setSearchTableTerm("");
    setCurrentPage(1);

    const today = new Date();
    setDateTo(
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`,
    );
  };

  const handleLogoutSystem = () => {
    Swal.fire({
      title: "ออกจากระบบ?",
      text: "ต้องการออกจากระบบรายงานกำลังพลใช่ไหม?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: isDarkMode ? "#1C2541" : "#64748b",
      confirmButtonText: "ใช่, ออกจากระบบ",
      cancelButtonText: "ยกเลิก",
      background: isDarkMode ? "#0B132B" : "#ffffff",
      color: isDarkMode ? "#f8fafc" : "#1e293b",
    }).then(async (result) => {
      if (result.isConfirmed) {
        await supabase.auth.signOut();
        router.push("/login");
      }
    });
  };

  // 📊 1. [ต้องอยู่บนสุด] กรองข้อมูลดิบหลักแบบเข้มงวดสูง (ทลายบั๊ก String Mismatch & Date Format)
  const filteredData = useMemo(() => {
    return rawData.filter((item) => {
      // ➔ กรองตามปี
      if (filterYear !== "All Year") {
        const itemYear = parseInt(item.year_num, 10);
        const selectedYear = parseInt(filterYear, 10);
        if (isNaN(itemYear) || itemYear !== selectedYear) return false;
      }

      // ➔ กรองตามเดือน (ใช้ ParseInt เพื่อแก้บั๊กเรื่องเลข "6" กับ "06")
      if (filterMonth !== "All Month") {
        const itemMonth = parseInt(item.month_num, 10);
        const selectedMonth = parseInt(filterMonth, 10);
        if (isNaN(itemMonth) || itemMonth !== selectedMonth) return false;
      }

      // ➔ กรองตามพื้นที่ สายงาน และสถานะทั่วไป
      if (filterArea !== "All Area" && item.area !== filterArea) return false;
      if (
        filterAreaCode !== "All Area Code" &&
        item.area_code !== filterAreaCode
      )
        return false;
      if (filterRole !== "All Role" && item.role !== filterRole) return false;
      if (
        filterEmpType !== "All Employee Type" &&
        item.employee_type !== filterEmpType
      )
        return false;
      if (filterStatus !== "All Status" && item.status_app !== filterStatus)
        return false;

      // ➔ กรองช่วงวันที่แบบทลายบั๊กด้วยการสกัด Regex จับหลักปี-เดือน-วัน สากลครับพี่
      if (item.date_stamp) {
        const dateNums = item.date_stamp.toString().match(/\d+/g);
        if (dateNums && dateNums.length >= 3) {
          let year = dateNums[2];
          let month = dateNums[1].padStart(2, "0");
          let day = dateNums[0].padStart(2, "0");

          if (dateNums[0].length === 4) {
            year = dateNums[0];
            month = dateNums[1].padStart(2, "0");
            day = dateNums[2].padStart(2, "0");
          }

          const cleanItemDate = `${year}-${month}-${day}`;

          if (dateFrom && cleanItemDate < dateFrom) return false;
          if (dateTo && cleanItemDate > dateTo) return false;
        }
      }
      return true;
    });
  }, [
    rawData,
    filterYear,
    filterMonth,
    filterArea,
    filterAreaCode,
    filterRole,
    filterEmpType,
    filterStatus,
    dateFrom,
    dateTo,
  ]);

  // 📈 2. คำนวณยอดเป้าหมายสะสมและคอลัมน์ TOTAL ให้ผันแปรแมตช์ตามตัวกรองด้านบน
  const globalTargetSum = useMemo(() => {
    const activeAreasInFilter = new Set(
      filteredData
        .flatMap((d) => [
          d.area?.toString().trim().toUpperCase(),
          d.area_code?.toString().trim().toUpperCase(),
        ])
        .filter(Boolean),
    );

    return areaTargets.reduce(
      (acc, area) => {
        const areaNameUpper = area.name?.toString().trim().toUpperCase();
        const areaIdUpper = area.id?.toString().trim().toUpperCase();

        if (filterArea !== "All Area" && area.name !== filterArea) return acc;
        if (filterAreaCode !== "All Area Code" && area.id !== filterAreaCode)
          return acc;

        const isAreaActive =
          activeAreasInFilter.has(areaNameUpper) ||
          activeAreasInFilter.has(areaIdUpper);
        if (filteredData.length > 0 && !isAreaActive) return acc;

        const roles = ["KOE", "MER", "COM", "BA"];
        roles.forEach((r) => {
          if (filterRole !== "All Role" && r !== filterRole) return;
          acc.plan[r] += area.plan[r] || 0;
          acc.approve[r] += area.approve[r] || 0;
        });

        return acc;
      },
      {
        plan: { KOE: 0, MER: 0, COM: 0, BA: 0 },
        approve: { KOE: 0, MER: 0, COM: 0, BA: 0 },
      },
    );
  }, [areaTargets, filteredData, filterArea, filterAreaCode, filterRole]);

  // 📈 3. ชุดข้อมูลสถิติสำหรับวาดกราฟเส้น Headcount Trend (ปรับเปลี่ยนจาก Static เป็น Dynamic วิ่งตามฟิลเตอร์แล้วครับพี่!)
  const monthlyTimelineData = useMemo(() => {
    const monthsMap: Record<string, any> = {};

    filteredData.forEach((item) => {
      const y = item.year_num?.toString() || "2026";
      const m = (item.month_num?.toString() || "").padStart(2, "0");
      if (!m) return;
      const key = `${y}-${m}`;

      if (!monthsMap[key]) {
        monthsMap[key] = {
          month: key,
          total: 0,
          ปกติ: 0,
          รอลงงาน: 0,
          สรรหา: 0,
          แจ้งลาออก: 0,
        };
      }

      monthsMap[key].total += 1;
      if (item.status_app === "ปกติ") monthsMap[key]["ปกติ"] += 1;
      else if (item.status_app === "รอลงงาน") monthsMap[key]["รอลงงาน"] += 1;
      else if (item.status_app === "สรรหา") monthsMap[key]["สรรหา"] += 1;
      else if (item.status_app === "แจ้งลาออก")
        monthsMap[key]["แจ้งลาออก"] += 1;
    });

    return Object.values(monthsMap)
      .map((m: any) => {
        const shareVal =
          filteredData.length > 0 ? (m.total / filteredData.length) * 100 : 0;
        return {
          month: m.month,
          Share: parseFloat(shareVal.toFixed(1)),
          ปกติ: m["ปกติ"],
          รอลงงาน: m["รอลงงาน"],
          สรรหา: m["สรรหา"],
          แจ้งลาออก: m["แจ้งลาออก"],
        };
      })
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredData]);

  // 📋 ตัวแปรผลลัพธ์คำนวณจำนวนจริงที่จะส่งเข้าสู่ 6 กล่องด้านบนสุด
  const totalCount = filteredData.length;
  const activeCount = filteredData.filter(
    (d) => d.status_app === "ปกติ",
  ).length;
  const waitingCount = filteredData.filter(
    (d) => d.status_app === "รอลงงาน",
  ).length;
  const recruitingCount = filteredData.filter(
    (d) => d.status_app === "สรรหา",
  ).length;
  const resignedCount = filteredData.filter(
    (d) => d.status_app === "แจ้งลาออก",
  ).length;
  const suspendedCount = filteredData.filter(
    (d) => d.status_app === "ระงับการใช้งาน",
  ).length;

  const pieStatusData = [
    { name: "ปกติ", value: activeCount },
    { name: "รอลงงาน", value: waitingCount },
    { name: "ระงับการใช้งาน", value: suspendedCount },
    { name: "สรรหา", value: recruitingCount },
    { name: "แจ้งลาออก", value: resignedCount },
  ].filter((v) => v.value > 0);

  const pieTypeData = ["BA", "COM", "KOE", "MER"]
    .map((type) => ({
      name: type,
      value: filteredData.filter((d) => d.employee_type === type).length,
    }))
    .filter((v) => v.value > 0);

  const handleAddNewAreaBlock = () => {
    if (
      !selectedAreaInput ||
      areaTargets.some((t) => t.id === selectedAreaInput)
    )
      return;
    setAreaTargets([
      ...areaTargets,
      {
        id: selectedAreaInput,
        name: selectedAreaInput,
        open: true,
        plan: { KOE: 0, MER: 0, COM: 0, BA: 0 },
        approve: { KOE: 0, MER: 0, COM: 0, BA: 0 },
      },
    ]);
    setSelectedAreaInput("");
  };

  const handleCopyStructureValues = (idx: number) => {
    const freshData = [...areaTargets];
    freshData[idx].plan = { KOE: 1, MER: 15, COM: 1, BA: 1 };
    freshData[idx].approve = { KOE: 1, MER: 12, COM: 1, BA: 1 };
    setAreaTargets(freshData);
  };

  const handleSortToggle = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;

  const searchedRows = [...filteredData].filter((item) => {
    if (!searchTableTerm) return true;
    const term = searchTableTerm.toLowerCase();
    return (
      item.fullname?.toLowerCase().includes(term) ||
      item.employee_id?.toString().includes(term) ||
      item.area_code?.toLowerCase().includes(term)
    );
  });

  const sortedTableRows = searchedRows.sort((a, b) => {
    const valA = a[sortField] || "";
    const valB = b[sortField] || "";
    return sortAsc ? (valA > valB ? 1 : -1) : valA < valB ? 1 : -1;
  });

  const currentTableData = sortedTableRows.slice(
    indexOfFirstRow,
    indexOfLastRow,
  );
  const totalPagesCount = Math.ceil(sortedTableRows.length / rowsPerPage);

  return (
    <div
      className={`min-h-screen font-sans p-4 md:p-6 space-y-6 select-none transition-colors duration-300 ${isDarkMode ? "bg-[#060A13] text-slate-100" : "bg-[#f8fafc] text-slate-800"}`}
    >
      {/* Header Bar */}
      <div
        className={`border rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xl transition-colors duration-300 ${isDarkMode ? "bg-[#0B132B] border-[#1C2541]" : "bg-white border-slate-200"}`}
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600/10 text-blue-400 rounded-xl border border-blue-500/20">
            <Users size={22} />
          </div>
          <div>
            <h1
              className={`text-xl font-black uppercase ${isDarkMode ? "text-white" : "text-slate-900"}`}
            >
              Manpower Analytics
            </h1>
            <p className="text-[11px] text-slate-400 font-bold uppercase mt-0.5">
              War room strategic board
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
          <span className="text-slate-400 mr-2 flex items-center gap-1">
            <Calendar size={13} />{" "}
            {mounted
              ? new Date().toLocaleDateString("en-US", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : "Loading..."}
          </span>
          <button
            onClick={fetchWarRoomDatabase}
            className={`p-2 rounded-xl border transition-all ${isDarkMode ? "bg-[#1C2541] border-slate-700/60 hover:bg-slate-700 text-slate-200" : "bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700"}`}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => router.push("/kpi")}
            className={`flex items-center gap-1 border px-3 py-2 rounded-xl transition-all ${isDarkMode ? "bg-[#1C2541] border-slate-700/60 hover:bg-slate-700 text-slate-200" : "bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700"}`}
          >
            <Trophy size={14} className="text-yellow-400" /> KPI Scoring
          </button>
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2 rounded-xl border transition-all ${isDarkMode ? "bg-[#1C2541] border-slate-700/60 hover:bg-slate-700 text-yellow-400" : "bg-slate-100 border-slate-200 hover:bg-slate-200 text-indigo-600"}`}
          >
            {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <button
            onClick={handleLogoutSystem}
            className="p-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 rounded-xl border border-red-500/20 cursor-pointer"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>

      {/* Dynamic Filter Panel */}
      <div
        className={`border rounded-2xl p-5 shadow-xl space-y-4 transition-colors duration-300 ${isDarkMode ? "bg-[#0B132B] border-[#1C2541]" : "bg-white border-slate-200"}`}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-bold">
          <div>
            <label className="block text-slate-400 mb-1.5 uppercase tracking-wider text-[10px]">
              Year
            </label>
            <select
              value={filterYear}
              onChange={(e) => {
                setFilterYear(e.target.value);
                setCurrentPage(1);
              }}
              className={`w-full border rounded-xl px-3 py-2 font-black outline-none cursor-pointer ${isDarkMode ? "bg-[#111A36] border-[#222F54] text-white" : "bg-slate-50 border-slate-200 text-slate-800"}`}
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-slate-400 mb-1.5 uppercase tracking-wider text-[10px]">
              Month
            </label>
            <select
              value={filterMonth}
              onChange={(e) => {
                setFilterMonth(e.target.value);
                setCurrentPage(1);
              }}
              className={`w-full border rounded-xl px-3 py-2 font-black outline-none cursor-pointer ${isDarkMode ? "bg-[#111A36] border-[#222F54] text-white" : "bg-slate-50 border-slate-200 text-slate-800"}`}
            >
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {m === "All Month" ? m : MONTH_NAMES[m] || `Month ${m}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-slate-400 mb-1.5 uppercase tracking-wider text-[10px]">
              Area
            </label>
            <select
              value={filterArea}
              onChange={(e) => {
                setFilterArea(e.target.value);
                setCurrentPage(1);
              }}
              className={`w-full border rounded-xl px-3 py-2 font-black outline-none cursor-pointer ${isDarkMode ? "bg-[#111A36] border-[#222F54] text-white" : "bg-slate-50 border-slate-200 text-slate-800"}`}
            >
              {availableAreas.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-slate-400 mb-1.5 uppercase tracking-wider text-[10px]">
              Area Code
            </label>
            <select
              value={filterAreaCode}
              onChange={(e) => {
                setFilterAreaCode(e.target.value);
                setCurrentPage(1);
              }}
              className={`w-full border rounded-xl px-3 py-2 font-black outline-none cursor-pointer ${isDarkMode ? "bg-[#111A36] border-[#222F54] text-white" : "bg-slate-50 border-slate-200 text-slate-800"}`}
            >
              {availableAreaCodes.map((ac) => (
                <option key={ac} value={ac}>
                  {ac}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-1 text-xs font-bold">
          <div className="w-full sm:w-1/4">
            <label className="block text-slate-400 mb-1.5 uppercase tracking-wider text-[10px]">
              Date To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className={`w-full border rounded-xl px-3 py-1.5 outline-none font-black ${isDarkMode ? "bg-[#111A36] border-[#222F54] text-white" : "bg-slate-50 border-slate-200 text-slate-800"}`}
            />
          </div>
          <button
            onClick={handleClearAllFilters}
            className={`border px-4 py-2.5 rounded-xl transition-all cursor-pointer mt-4 sm:mt-0 ${isDarkMode ? "bg-[#1C2541] border-slate-700 text-slate-300 hover:bg-slate-700" : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"}`}
          >
            ✕ Clear Filters
          </button>
        </div>
      </div>

      {/* Target Summary Section & Configuration Console */}
      <div
        className={`border rounded-2xl p-5 shadow-2xl space-y-5 transition-colors duration-300 ${isDarkMode ? "bg-[#0B132B] border-[#1C2541]" : "bg-white border-slate-200"}`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-3 border-slate-800/40">
          <h3
            className={`text-sm font-black flex items-center gap-1.5 ${isDarkMode ? "text-white" : "text-slate-900"}`}
          >
            🎯 Target Configuration Board (กรอบอัตรากำลังพลสะสม)
          </h3>
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            <select
              value={selectedAreaInput}
              onChange={(e) => setSelectedAreaInput(e.target.value)}
              className={`border px-2 py-1.5 rounded-xl outline-none font-bold ${isDarkMode ? "bg-[#111A36] border-[#222F54] text-slate-200" : "bg-slate-50 border-slate-200 text-slate-800"}`}
            >
              <option value="">เลือก Area เพื่อเพิ่ม Target</option>
              {["K01", "K02", "K03", "K04", "K05", "K06", "K07", "K08"].map(
                (v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ),
              )}
            </select>
            <button
              onClick={handleAddNewAreaBlock}
              className={`flex items-center gap-1 border px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${isDarkMode ? "bg-[#1C2541] border-slate-700 text-white" : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"}`}
            >
              <Plus size={13} /> เพิ่ม Area
            </button>
            <button
              onClick={handleSaveTargetsToSupabase}
              disabled={isSavingTarget}
              className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-1.5 rounded-xl font-black transition-all cursor-pointer shadow-md"
            >
              {isSavingTarget ? (
                <RefreshCw size={13} className="animate-spin" />
              ) : (
                <Save size={13} />
              )}
              {isSavingTarget ? "กำลังบันทึก..." : "บันทึก Target ทั้งหมด"}
            </button>
          </div>
        </div>

        {/* แผงควบคุมกล่องรวมสะสมชั้นนำตัวใหม่ (5 คอลลัมน์รวม TOTAL) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-black">
          <div
            className={`p-4 rounded-xl border space-y-2 ${isDarkMode ? "bg-[#111728] border-slate-800" : "bg-slate-50 border-slate-200"}`}
          >
            <span className="text-yellow-500 text-[11px] uppercase block font-black">
              📋 Total Target Plan สะสม
            </span>
            <div className="grid grid-cols-5 gap-2 text-center text-sm">
              {["KOE", "MER", "COM", "BA"].map((r) => (
                <div
                  key={r}
                  className={`p-2 rounded-lg border ${isDarkMode ? "bg-[#060A13] border-slate-800" : "bg-white border-slate-200"}`}
                >
                  <span className="text-[10px] text-slate-500 block font-bold">
                    {r}
                  </span>
                  <span
                    className={`font-mono text-base font-black ${isDarkMode ? "text-white" : "text-slate-900"}`}
                  >
                    {(globalTargetSum.plan as any)[r]}
                  </span>
                </div>
              ))}
              <div
                className={`p-2 rounded-lg border ${isDarkMode ? "bg-yellow-500/10 border-yellow-500/20" : "bg-yellow-50 border-yellow-200"}`}
              >
                <span className="text-[10px] text-yellow-500 block font-black">
                  TOTAL
                </span>
                <span className="font-mono text-base font-black text-yellow-500">
                  {globalTargetSum.plan.KOE +
                    globalTargetSum.plan.MER +
                    globalTargetSum.plan.COM +
                    globalTargetSum.plan.BA}
                </span>
              </div>
            </div>
          </div>

          <div
            className={`p-4 rounded-xl border space-y-2 ${isDarkMode ? "bg-[#111728] border-slate-800" : "bg-slate-50 border-slate-200"}`}
          >
            <span className="text-emerald-500 text-[11px] uppercase block font-black">
              ✅ Total Target Approve สะสม
            </span>
            <div className="grid grid-cols-5 gap-2 text-center text-sm">
              {["KOE", "MER", "COM", "BA"].map((r) => (
                <div
                  key={r}
                  className={`p-2 rounded-lg border ${isDarkMode ? "bg-[#060A13] border-slate-800" : "bg-white border-slate-200"}`}
                >
                  <span className="text-[10px] text-slate-500 block font-bold">
                    {r}
                  </span>
                  <span
                    className={`font-mono text-base font-black ${isDarkMode ? "text-white" : "text-slate-900"}`}
                  >
                    {(globalTargetSum.approve as any)[r]}
                  </span>
                </div>
              ))}
              <div
                className={`p-2 rounded-lg border ${isDarkMode ? "bg-emerald-500/10 border-emerald-500/20" : "bg-emerald-50 border-emerald-200"}`}
              >
                <span className="text-[10px] text-emerald-500 block font-black">
                  TOTAL
                </span>
                <span className="font-mono text-base font-black text-emerald-500">
                  {globalTargetSum.approve.KOE +
                    globalTargetSum.approve.MER +
                    globalTargetSum.approve.COM +
                    globalTargetSum.approve.BA}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Accordion รายพื้นที่ */}
        <div className="space-y-3 text-xs font-bold pt-2">
          {areaTargets.map((area, idx) => (
            <div
              key={area.id}
              className={`border rounded-xl p-4 space-y-3 transition-colors duration-300 ${isDarkMode ? "bg-[#111728] border-slate-800" : "bg-slate-50 border-slate-200"}`}
            >
              <div className="flex items-center justify-between">
                <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded font-black text-[10px]">
                  {area.name} Area Target
                </span>
                <button
                  onClick={() => {
                    const copy = [...areaTargets];
                    copy[idx].open = !copy[idx].open;
                    setAreaTargets(copy);
                  }}
                  className="text-slate-400"
                >
                  {area.open ? (
                    <ChevronUp size={15} />
                  ) : (
                    <ChevronDown size={15} />
                  )}
                </button>
              </div>

              {area.open && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-yellow-600 font-bold block">
                      Target Plan
                    </span>
                    <div className="grid grid-cols-5 gap-2 text-center">
                      {["KOE", "MER", "COM", "BA"].map((r) => (
                        <div
                          key={r}
                          className={`border p-1.5 rounded-lg ${isDarkMode ? "bg-[#17203A] border-slate-800" : "bg-white border-slate-200"}`}
                        >
                          <span className="text-[9px] text-slate-400 block">
                            {r}
                          </span>
                          <input
                            type="number"
                            value={(area.plan as any)[r]}
                            onChange={(e) => {
                              const copy = [...areaTargets];
                              copy[idx].plan[r] = parseInt(e.target.value) || 0;
                              setAreaTargets(copy);
                            }}
                            className={`bg-transparent w-full text-center font-mono font-black outline-none ${isDarkMode ? "text-white" : "text-slate-900"}`}
                          />
                        </div>
                      ))}
                      <div
                        className={`border p-1.5 rounded-lg flex flex-col justify-center ${isDarkMode ? "bg-[#242A3D] border-yellow-500/20 text-yellow-400" : "bg-yellow-50 border-yellow-200 text-yellow-600"}`}
                      >
                        <span className="text-[9px] opacity-70 block font-black">
                          TOTAL
                        </span>
                        <span className="font-mono font-black text-xs">
                          {area.plan.KOE +
                            area.plan.MER +
                            area.plan.COM +
                            area.plan.BA}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] text-emerald-600 font-bold block">
                      Target Approve
                    </span>
                    <div className="grid grid-cols-5 gap-2 text-center">
                      {["KOE", "MER", "COM", "BA"].map((r) => (
                        <div
                          key={r}
                          className={`border p-1.5 rounded-lg ${isDarkMode ? "bg-[#17203A] border-slate-800" : "bg-white border-slate-200"}`}
                        >
                          <span className="text-[9px] text-slate-400 block">
                            {r}
                          </span>
                          <input
                            type="number"
                            value={(area.approve as any)[r]}
                            onChange={(e) => {
                              const copy = [...areaTargets];
                              copy[idx].approve[r] =
                                parseInt(e.target.value) || 0;
                              setAreaTargets(copy);
                            }}
                            className={`bg-transparent w-full text-center font-mono font-black outline-none ${isDarkMode ? "text-white" : "text-slate-900"}`}
                          />
                        </div>
                      ))}
                      <div
                        className={`border p-1.5 rounded-lg flex flex-col justify-center ${isDarkMode ? "bg-[#1B2C2B] border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-600"}`}
                      >
                        <span className="text-[9px] opacity-70 block font-black">
                          TOTAL
                        </span>
                        <span className="font-mono font-black text-xs">
                          {area.approve.KOE +
                            area.approve.MER +
                            area.approve.COM +
                            area.approve.BA}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`flex items-center gap-2 lg:col-span-2 pt-2 border-t text-[10px] ${isDarkMode ? "border-slate-800/40" : "border-slate-200"}`}
                  >
                    <button
                      onClick={() => handleCopyStructureValues(idx)}
                      className={`flex items-center gap-1 border px-3 py-1 rounded-lg transition-all ${isDarkMode ? "bg-[#1C2541] border-slate-700 text-slate-300" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                    >
                      <Copy size={11} /> โหลดค่าดีฟอลต์แนะนำ
                    </button>
                    <button
                      onClick={() =>
                        setAreaTargets(
                          areaTargets.filter((t) => t.id !== area.id),
                        )
                      }
                      className="flex items-center gap-1 bg-red-600/10 text-red-500 border border-red-500/20 px-3 py-1 rounded-lg"
                    >
                      <Trash2 size={11} /> ถอนพื้นที่ออก
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Counter Blocks (6 กล่องด้านบนสุดที่ผูกกับตัวแปรที่คัดกรองเสร็จสมบูรณ์เรียบร้อยครับพี่) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          className={`border p-3 rounded-xl flex items-center justify-between shadow-xl transition-colors duration-300 ${isDarkMode ? "bg-[#0B132B] border-[#1C2541]" : "bg-white border-slate-200"}`}
        >
          <div className="space-y-0.5">
            <span className="text-[9px] font-bold text-slate-400 uppercase block">
              Total Employees
            </span>
            <h4
              className={`text-xl font-black ${isDarkMode ? "text-white" : "text-slate-900"}`}
            >
              {totalCount.toLocaleString()}
            </h4>
            <span className="text-[8px] bg-blue-600/10 text-blue-400 px-1.5 py-0.5 rounded font-bold">
              Active Filtered
            </span>
          </div>
          <div className="p-2 bg-slate-800/80 text-slate-400 rounded-lg">
            <Users size={16} />
          </div>
        </div>
        {["ปกติ", "รอลงงาน", "สรรหา", "แจ้งลาออก", "ระงับการใช้งาน"].map(
          (st) => {
            const matchCount =
              st === "ปกติ"
                ? activeCount
                : st === "รอลงงาน"
                  ? waitingCount
                  : st === "สรรหา"
                    ? recruitingCount
                    : st === "แจ้งลาออก"
                      ? resignedCount
                      : suspendedCount;
            return (
              <div
                key={st}
                className={`border p-3 rounded-xl flex items-center justify-between shadow-xl transition-colors duration-300 ${isDarkMode ? "bg-[#0B132B] border-[#1C2541]" : "bg-white border-slate-200"}`}
                style={{
                  borderLeftWidth: "4px",
                  borderLeftColor: (STATUS_COLORS as any)[st] || "#64748b",
                }}
              >
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">
                    สถานะ {st}
                  </span>
                  <h4
                    className={`text-xl font-black ${isDarkMode ? "text-white" : "text-slate-900"}`}
                  >
                    {matchCount.toLocaleString()}
                  </h4>
                  <span className="text-[8px] text-slate-500 block font-bold">
                    ตามการกรอง Filter
                  </span>
                </div>
              </div>
            );
          },
        )}
      </div>

      {/* Recharts Analytics Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          className={`border p-4 rounded-2xl shadow-xl space-y-3 min-h-80 transition-colors duration-300 ${isDarkMode ? "bg-[#0B132B] border-[#1C2541]" : "bg-white border-slate-200"}`}
        >
          <div className="flex items-center justify-between">
            <h4
              className={`text-xs font-black uppercase ${isDarkMode ? "text-white" : "text-slate-900"}`}
            >
              Status Distribution
            </h4>
            <div
              className={`p-0.5 rounded-lg flex text-[10px] border font-bold ${isDarkMode ? "bg-[#111A36] border-[#222F54]" : "bg-slate-100 border-slate-200"}`}
            >
              <button
                onClick={() => setChartMode("percent")}
                className={`px-2 py-0.5 rounded ${chartMode === "percent" ? "bg-blue-600 text-white" : "text-slate-400"}`}
              >
                %
              </button>
              <button
                onClick={() => setChartMode("count")}
                className={`px-2 py-0.5 rounded ${chartMode === "count" ? "bg-blue-600 text-white" : "text-slate-400"}`}
              >
                # Count
              </button>
            </div>
          </div>
          <div className="h-56 w-full text-xs font-bold relative block">
            {mounted && totalCount > 0 ? (
              <ResponsiveContainer width="100%" height={224}>
                <PieChart>
                  <Pie
                    data={pieStatusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={2}
                  >
                    {pieStatusData.map((e: any) => (
                      <Cell
                        key={e.name}
                        fill={(STATUS_COLORS as any)[e.name] || "#fff"}
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value) => [
                      chartMode === "percent"
                        ? `${((Number(value) / totalCount) * 100).toFixed(1)}%`
                        : `${value} ราย`,
                      "สัดส่วน",
                    ]}
                  />
                  <RechartsLegend
                    verticalAlign="bottom"
                    height={24}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex items-center justify-center text-slate-400 text-xs py-12">
                ไม่มีข้อมูลแสดงสถิติสถานะในระบบ
              </div>
            )}
          </div>
        </div>

        <div
          className={`border p-4 rounded-2xl shadow-xl space-y-3 min-h-80 transition-colors duration-300 ${isDarkMode ? "bg-[#0B132B] border-[#1C2541]" : "bg-white border-slate-200"}`}
        >
          <h4
            className={`text-xs font-black uppercase ${isDarkMode ? "text-white" : "text-slate-900"}`}
          >
            Employee Type Distribution
          </h4>
          <div className="h-56 w-full text-xs font-bold relative block">
            {mounted && totalCount > 0 ? (
              <ResponsiveContainer width="100%" height={224}>
                <PieChart>
                  <Pie
                    data={pieTypeData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={2}
                  >
                    {pieTypeData.map((e: any) => (
                      <Cell
                        key={e.name}
                        fill={(TYPE_COLORS as any)[e.name] || "#fff"}
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value) => [
                      chartMode === "percent"
                        ? `${((Number(value) / totalCount) * 100).toFixed(1)}%`
                        : `${value} ราย`,
                      "สายงาน",
                    ]}
                  />
                  <RechartsLegend
                    verticalAlign="bottom"
                    height={24}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex items-center justify-center text-slate-400 text-xs py-12">
                ไม่มีข้อมูลแสดงสถิติตามสายงาน
              </div>
            )}
          </div>
        </div>

        <div
          className={`border p-4 rounded-2xl shadow-xl space-y-2 lg:col-span-2 min-h-75 transition-colors duration-300 ${isDarkMode ? "bg-[#0B132B] border-[#1C2541]" : "bg-white border-slate-200"}`}
        >
          <h4
            className={`text-xs font-black uppercase ${isDarkMode ? "text-white" : "text-slate-900"}`}
          >
            Headcount Trend (% share per month)
          </h4>
          <div className="h-56 w-full text-xs font-bold relative block">
            {mounted && monthlyTimelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height={224}>
                <LineChart
                  data={monthlyTimelineData}
                  margin={{ left: -20, right: 10, top: 10 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke={isDarkMode ? "#1C2541" : "#e2e8f0"}
                  />
                  <XAxis dataKey="month" stroke="#64748b" />
                  <YAxis stroke="#64748b" unit="%" />
                  <RechartsTooltip />
                  <Line
                    type="monotone"
                    dataKey="Share"
                    stroke="#ea580c"
                    strokeWidth={3}
                    dot={{ r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex items-center justify-center text-slate-400 text-xs py-12">
                ไม่มีข้อมูลเส้นประวัติแนวโน้มตามเงื่อนไขตัวกรอง
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Data Table */}
      <div
        className={`border rounded-2xl shadow-2xl overflow-hidden transition-colors duration-300 ${isDarkMode ? "bg-[#0B132B] border-[#1C2541]" : "bg-white border-slate-200"}`}
      >
        <div
          className={`p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-b ${isDarkMode ? "bg-[#111A36]/40 border-[#222F54]" : "bg-slate-50 border-slate-200"}`}
        >
          <div className="relative w-full sm:w-80">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
              <Search size={14} />
            </span>
            <input
              type="text"
              value={searchTableTerm}
              onChange={(e) => {
                setSearchTableTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by Full Name or Area Code..."
              className={`w-full border rounded-xl pl-9 pr-4 py-1.5 text-xs outline-none focus:border-blue-500/50 ${isDarkMode ? "bg-[#111A36] border-[#222F54] text-white" : "bg-white border-slate-200 text-slate-800"}`}
            />
          </div>
          <button
            className={`flex items-center gap-1.5 border font-bold text-xs px-4 py-2 rounded-xl text-slate-300 transition-all cursor-pointer ${isDarkMode ? "bg-[#1C2541] border-slate-700" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"}`}
          >
            <Download size={13} /> Export
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[11px] font-bold">
            <thead>
              <tr
                className={`border-b uppercase tracking-wider text-[10px] ${isDarkMode ? "bg-[#0f1526] text-slate-400 border-slate-800" : "bg-slate-100/80 text-slate-500 border-slate-200"}`}
              >
                {[
                  "date_stamp",
                  "employee_id",
                  "fullname",
                  "area",
                  "area_code",
                  "role",
                  "version",
                  "status_app",
                ].map((f) => (
                  <th
                    key={f}
                    onClick={() => handleSortToggle(f)}
                    className={`px-5 py-3.5 cursor-pointer select-none transition-colors ${isDarkMode ? "hover:bg-slate-800/40" : "hover:bg-slate-200/60"}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{f.replace("_", " ")}</span>
                      <ArrowUpDown size={11} className="text-slate-500" />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody
              className={`divide-y ${isDarkMode ? "divide-slate-800/40 text-slate-300" : "divide-slate-200 text-slate-600"}`}
            >
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center py-12 text-slate-500 font-bold animate-pulse"
                  >
                    กำลังดึงข้อมูลทำเนียบพนักงาน...
                  </td>
                </tr>
              ) : currentTableData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500">
                    ไม่พบแถวข้อมูลในระบบตาราง หรือไม่ตรงตามพารามิเตอร์การกรอง
                    Filter
                  </td>
                </tr>
              ) : (
                currentTableData.map((item: any, idx) => (
                  <tr
                    key={item.id || idx}
                    className={`transition-colors ${isDarkMode ? "hover:bg-slate-800/20" : "hover:bg-slate-100/60"}`}
                  >
                    <td className="px-5 py-3 text-slate-500 font-mono">
                      {item.date_stamp || "-"}
                    </td>
                    <td
                      className={`px-5 py-3 font-mono ${isDarkMode ? "text-white" : "text-slate-900"}`}
                    >
                      {item.employee_id || "-"}
                    </td>
                    <td
                      className={`px-5 py-3 font-black ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}
                    >
                      {item.fullname}
                    </td>
                    <td className="px-5 py-3 text-slate-400">
                      {item.area || "-"}
                    </td>
                    <td className="px-5 py-3 font-mono text-slate-400">
                      {item.area_code || "-"}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`px-2 py-0.5 rounded border text-[10px] ${isDarkMode ? "bg-[#1c2333] border-slate-800 text-slate-300" : "bg-slate-100 border-slate-200 text-slate-600"}`}
                      >
                        {item.role || "-"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-500 font-mono">
                      {item.version || "-"}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-black border"
                        style={{
                          backgroundColor: `${(STATUS_COLORS as any)[item.status_app]}15`,
                          color: (STATUS_COLORS as any)[item.status_app],
                          borderColor: `${(STATUS_COLORS as any)[item.status_app]}25`,
                        }}
                      >
                        {item.status_app}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div
          className={`p-4 border-t flex items-center justify-between text-[11px] font-bold text-slate-400 ${isDarkMode ? "bg-[#0f1526]/40 border-slate-800" : "bg-slate-50 border-slate-200"}`}
        >
          <span>
            Showing {indexOfFirstRow + 1}-
            {Math.min(indexOfLastRow, sortedTableRows.length)} of{" "}
            {sortedTableRows.length} รายการ
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className={`px-2 py-1 rounded-lg border cursor-pointer disabled:opacity-40 text-white ${isDarkMode ? "bg-[#1C2541] border-slate-700/60" : "bg-slate-200 border-slate-300 text-slate-700"}`}
            >
              ‹
            </button>
            <span
              className={`px-3 py-1 rounded-lg border font-mono ${isDarkMode ? "bg-[#111A36] border-[#222F54] text-white" : "bg-white border-slate-200 text-slate-800"}`}
            >
              {currentPage} / {totalPagesCount || 1}
            </span>
            <button
              onClick={() =>
                setCurrentPage((p) => Math.min(p + 1, totalPagesCount))
              }
              disabled={currentPage === totalPagesCount}
              className={`px-2 py-1 rounded-lg border cursor-pointer disabled:opacity-40 text-white ${isDarkMode ? "bg-[#1C2541] border-slate-700/60" : "bg-slate-200 border-slate-300 text-slate-700"}`}
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {/* Footer Block */}
      <footer
        className={`border-t rounded-2xl p-6 md:p-8 shadow-2xl transition-colors duration-300 ${isDarkMode ? "bg-[#0B132B] border-[#1C2541]" : "bg-white border-slate-200"}`}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-xs font-bold">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div
                className={`p-2.5 rounded-xl border ${isDarkMode ? "bg-[#060A13] border-slate-800 text-blue-400" : "bg-slate-100 border-slate-200 text-blue-600"}`}
              >
                <Building2 size={18} />
              </div>
              <div>
                <h4
                  className={`text-xs md:text-sm font-black uppercase tracking-wider ${isDarkMode ? "text-white" : "text-slate-900"}`}
                >
                  FMBD CONTROLLER
                </h4>
                <p className="text-[9px] text-slate-400 uppercase mt-0.5 font-bold">
                  Manpower Analytics
                </p>
              </div>
            </div>
            <p
              className={`text-[11px] leading-relaxed font-medium ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
            >
              ระบบติดตามและประเมินผลกำลังพลแบบเรียลไทม์
              สำหรับการบริหารทีมงานทั่วประเทศ
            </p>
          </div>
          <div className="space-y-3">
            <span className="text-slate-400 text-[10px] uppercase tracking-wider block font-black">
              NAVIGATION
            </span>
            <ul className="space-y-2.5">
              <li>
                <button
                  onClick={() =>
                    window.scrollTo({ top: 0, behavior: "smooth" })
                  }
                  className={`flex items-center gap-2 font-bold transition-colors ${isDarkMode ? "text-slate-300 hover:text-white" : "text-slate-600 hover:text-slate-900"}`}
                >
                  <ArrowUpDown size={13} className="text-slate-400" /> Dashboard
                </button>
              </li>
              <li>
                <button
                  onClick={() => router.push("/kpi")}
                  className={`flex items-center gap-2 font-bold transition-colors ${isDarkMode ? "text-slate-300 hover:text-white" : "text-slate-600 hover:text-slate-900"}`}
                >
                  <Trophy size={13} className="text-yellow-500" /> KPI Scoring
                </button>
              </li>
            </ul>
          </div>
          <div className="space-y-3">
            <span className="text-slate-400 text-[10px] uppercase tracking-wider block font-black">
              QUICK LINKS
            </span>
            <ul className="space-y-2.5">
              <li>
                <span
                  className={`flex items-center gap-2 cursor-pointer font-bold ${isDarkMode ? "text-slate-300 hover:text-white" : "text-slate-600 hover:text-slate-900"}`}
                >
                  <FileText size={13} className="text-slate-400" /> Target
                  Settings
                </span>
              </li>
              <li>
                <span
                  className={`flex items-center gap-2 cursor-pointer font-bold ${isDarkMode ? "text-slate-300 hover:text-white" : "text-slate-600 hover:text-slate-900"}`}
                >
                  <ShieldCheck size={13} className="text-slate-400" /> Penalty
                  Config
                </span>
              </li>
            </ul>
          </div>
          <div className="space-y-3">
            <span className="text-slate-400 text-[10px] uppercase tracking-wider block font-black">
              CONTACT
            </span>
            <ul className="space-y-2.5 font-medium text-[11px]">
              <li
                className={`flex items-center gap-2 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}
              >
                <Building2 size={13} className="text-slate-400 shrink-0" />{" "}
                Riverpro Intertrade Co., Ltd
              </li>
              <li
                className={`flex items-center gap-2 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}
              >
                <Mail size={13} className="text-slate-400 shrink-0" />{" "}
                Niwat_wiy@riverpro.co.th
              </li>
            </ul>
          </div>
        </div>
        <div
          className={`mt-8 pt-4 border-t flex flex-col sm:flex-row items-center justify-between text-[11px] font-bold text-slate-400 ${isDarkMode ? "border-slate-800/60" : "border-slate-200"}`}
        >
          <span>© 2026 Riverpro Intertrade Co., Ltd. All rights reserved.</span>
          <span>
            Powered by{" "}
            <span className={isDarkMode ? "text-white" : "text-slate-800"}>
              FMBD CONTROLLER
            </span>
          </span>
        </div>
      </footer>
    </div>
  );
}
