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
  Filter,
  CheckCircle,
  LogOut,
  Sun,
  Moon,
  Trophy,
  ArrowUpDown,
  Building2,
  MapPin,
  Mail,
  Phone,
  Globe,
  ExternalLink,
  FileText,
  HelpCircle,
  ShieldCheck,
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
  AreaChart,
  Area,
  BarChart,
  Bar,
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

// 🌈 ชุดสีสันสดใสพรีเมียมสำหรับเพิ่มมิติกราฟแท่งรายพื้นที่
const BAR_COLORS = [
  "#3b82f6",
  "#10b981",
  "#6366f1",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#f97316",
  "#14b8a6",
];

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
  const [mounted, setMounted] = useState(false);

  // 🌓 สเตทควบคุมระบบสลับโหมดมืด/สว่าง
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
  const [dateTo, setDateTo] = useState("2026-06-19");

  // คอนโทรลสลับโหมดการมองเห็นของ Charts วงกลม (% หรือ Count)
  const [chartMode, setChartMode] = useState<"percent" | "count">("percent");

  // ตารางควบคุมค้นหาและแบ่งหน้า (Pagination)
  const [searchTableTerm, setSearchTableTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<string>("date_stamp");
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const rowsPerPage = 10;

  // 🎯 คลังเก็บสถานะ Target ข้อมูลรายพื้นที่สำหรับ Recruit คีย์จัดการ
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

  // โหลดคลังข้อมูลหลักจากหลังบ้าน Supabase
  const fetchWarRoomDatabase = async () => {
    setLoading(true);
    try {
      // เรียกตรงไปยังตาราง public.data_app
      const { data, error } = await supabase.from("data_app").select("*");

      if (error) throw error;

      if (data) {
        setRawData(data);
        console.log("ดึงข้อมูลสำเร็จ จำนวน:", data.length, "แถว");
      }
    } catch (err: any) {
      console.error("ฐานข้อมูลขัดข้อง:", err);
      // ถ้าล่มหรือติด RLS ให้แจ้งเตือนบอกสาเหตุทันที
      Swal.fire({
        icon: "error",
        title: "การดึงข้อมูลขัดข้อง",
        text: err.message || "เกิดข้อผิดพลาดในการเข้าถึงข้อมูลตาราง data_app",
        background: isDarkMode ? "#0B132B" : "#ffffff",
        color: isDarkMode ? "#f8fafc" : "#1e293b",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarRoomDatabase();
    setMounted(true);
  }, []);

  // 🌐 ดึงค่าตัวเลือกฟิลเตอร์ที่ไม่ซ้ำ (Unique Options) จากฐานข้อมูลจริงโดยตรง ป้องกันบั๊กสะกดคำผิด
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
  const availableRoles = useMemo(
    () => [
      "All Role",
      ...Array.from(new Set(rawData.map((d) => d.role).filter(Boolean))),
    ],
    [rawData],
  );
  const availableEmpTypes = useMemo(
    () => [
      "All Employee Type",
      ...Array.from(
        new Set(rawData.map((d) => d.employee_type).filter(Boolean)),
      ),
    ],
    [rawData],
  );
  const availableStatuses = useMemo(
    () => [
      "All Status",
      ...Array.from(new Set(rawData.map((d) => d.status_app).filter(Boolean))),
    ],
    [rawData],
  );

  // 📝 ลอจิกการล้างกลุ่มฟิลเตอร์ทั้งหมดให้กลับมาค่าตั้งต้น
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
  };

  // 🚪 ฟังก์ชันล็อกเอ้าท์ออกจากระบบร่วมกับ SweetAlert 2
  const handleLogoutSystem = () => {
    Swal.fire({
      title: "ออกจากระบบ?",
      text: "พี่ยอดต้องการออกจากระบบรายงานกำลังพลใช่ไหมครับ?",
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

  // 📈 ลอจิกคำนวณสะสมรวมของทุก Area อัตโนมัติส่งขึ้นกล่องด้านบน
  const globalTargetSum = areaTargets.reduce(
    (acc, area) => {
      acc.plan.KOE += area.plan.KOE;
      acc.plan.MER += area.plan.MER;
      acc.plan.COM += area.plan.COM;
      acc.plan.BA += area.plan.BA;
      acc.approve.KOE += area.approve.KOE;
      acc.approve.MER += area.approve.MER;
      acc.approve.COM += area.approve.COM;
      acc.approve.BA += area.approve.BA;
      return acc;
    },
    {
      plan: { KOE: 0, MER: 0, COM: 0, BA: 0 },
      approve: { KOE: 0, MER: 0, COM: 0, BA: 0 },
    },
  );

  // 🔍 ลอจิกกรองข้อมูลผันแปรตามสิทธิ์ Filter การเลือกใช้งาน
  const filteredData = useMemo(() => {
    return rawData.filter((item) => {
      if (filterYear !== "All Year" && item.year_num?.toString() !== filterYear)
        return false;
      if (
        filterMonth !== "All Month" &&
        item.month_num?.toString() !== filterMonth
      )
        return false;
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

      if (item.date_stamp) {
        const parts = item.date_stamp.split("-");
        let standardDate = item.date_stamp;
        if (parts[0] && parts[0].length === 2) {
          standardDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        if (standardDate < dateFrom || standardDate > dateTo) return false;
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

  // 📊 บล็อกคิดสถิติตัวเลขพนักงานปรับเปลี่ยนตามการเลือก Filter
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

  // 🍩 ฟังก์ชันเตรียมชุดข้อมูลเพื่อส่งไปวาดกราฟโชว์
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

  const monthlyTimelineData = [
    {
      month: "2026-02",
      Share: 7.3,
      ปกติ: 70,
      รอลงงาน: 10,
      สรรหา: 15,
      แจ้งลาออก: 5,
    },
    {
      month: "2026-03",
      Share: 25.4,
      ปกติ: 74,
      รอลงงาน: 8,
      สรรหา: 12,
      แจ้งลาออก: 6,
    },
    {
      month: "2026-04",
      Share: 24.8,
      ปกติ: 76,
      รอลงงาน: 7,
      สรรหา: 13,
      แจ้งลาออก: 4,
    },
    {
      month: "2026-05",
      Share: 25.8,
      ปกติ: 77.5,
      รอลงงาน: 5,
      สรรหา: 15,
      แจ้งลาออก: 2.5,
    },
    {
      month: "2026-06",
      Share: 16.5,
      ปกติ: 78.2,
      รอลงงาน: 4,
      สรรหา: 14,
      แจ้งลาออก: 3.8,
    },
  ];

  const areaCodeList = Array.from(
    new Set(filteredData.map((d) => d.area).filter(Boolean)),
  );
  const barChartAreaProps = areaCodeList
    .map((areaName) => {
      const areaSubset = filteredData.filter((d) => d.area === areaName).length;
      return {
        name: areaName,
        percentage:
          totalCount > 0
            ? parseFloat(((areaSubset / totalCount) * 100).toFixed(1))
            : 0,
        count: areaSubset,
      };
    })
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 8);

  // 🛠️ ลอจิกการกดเพิ่ม/ลบ แถวเขตพื้นที่เพื่อลงข้อมูล Target
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
    freshData[idx].plan = { KOE: 10, MER: 87, COM: 4, BA: 10 };
    freshData[idx].approve = { KOE: 8, MER: 58, COM: 4, BA: 10 };
    setAreaTargets(freshData);
  };

  // 📋 ลอจิกลงตำแหน่งการเรียงแถวและพลิกหน้าตารางหลัก (Sorting & Pagination)
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
            <Calendar size={13} /> Fri, 19 Jun 2026
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
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 text-xs font-bold">
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
          <div>
            <label className="block text-slate-400 mb-1.5 uppercase tracking-wider text-[10px]">
              Role
            </label>
            <select
              value={filterRole}
              onChange={(e) => {
                setFilterRole(e.target.value);
                setCurrentPage(1);
              }}
              className={`w-full border rounded-xl px-3 py-2 font-black outline-none cursor-pointer ${isDarkMode ? "bg-[#111A36] border-[#222F54] text-white" : "bg-slate-50 border-slate-200 text-slate-800"}`}
            >
              {availableRoles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-slate-400 mb-1.5 uppercase tracking-wider text-[10px]">
              Employee Type
            </label>
            <select
              value={filterEmpType}
              onChange={(e) => {
                setFilterEmpType(e.target.value);
                setCurrentPage(1);
              }}
              className={`w-full border rounded-xl px-3 py-2 font-black outline-none cursor-pointer ${isDarkMode ? "bg-[#111A36] border-[#222F54] text-white" : "bg-slate-50 border-slate-200 text-slate-800"}`}
            >
              {availableEmpTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-slate-400 mb-1.5 uppercase tracking-wider text-[10px]">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className={`w-full border rounded-xl px-3 py-2 font-black outline-none cursor-pointer ${isDarkMode ? "bg-[#111A36] border-[#222F54] text-white" : "bg-slate-50 border-slate-200 text-slate-800"}`}
            >
              {availableStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-slate-400 mb-1.5 uppercase tracking-wider text-[10px]">
              Date From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className={`w-full border rounded-xl px-3 py-1.5 outline-none font-black ${isDarkMode ? "bg-[#111A36] border-[#222F54] text-white" : "bg-slate-50 border-slate-200 text-slate-800"}`}
            />
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

      {/* Target Summary Section */}
      <div
        className={`border rounded-2xl p-5 shadow-2xl space-y-4 transition-colors duration-300 ${isDarkMode ? "bg-[#0B132B] border-[#1C2541]" : "bg-white border-slate-200"}`}
      >
        <h3
          className={`text-sm font-black flex items-center gap-1.5 ${isDarkMode ? "text-white" : "text-slate-900"}`}
        >
          🎯 Target Settings (คำนวณสะสมรวมอัตโนมัติจากเขตย่อย)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-black">
          <div
            className={`p-4 rounded-xl border space-y-2 ${isDarkMode ? "bg-[#111728] border-slate-800" : "bg-slate-50 border-slate-200"}`}
          >
            <span className="text-yellow-500 text-[11px] uppercase block">
              📋 Total Target Plan สะสม
            </span>
            <div className="grid grid-cols-4 gap-2 text-center text-sm">
              {["KOE", "MER", "COM", "BA"].map((r) => (
                <div
                  key={r}
                  className={`p-2 rounded-lg border ${isDarkMode ? "bg-[#060A13] border-slate-800" : "bg-white border-slate-200"}`}
                >
                  <span className="text-[10px] text-slate-500 block">{r}</span>
                  <span
                    className={`font-mono text-base font-black ${isDarkMode ? "text-white" : "text-slate-900"}`}
                  >
                    {(globalTargetSum.plan as any)[r]}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div
            className={`p-4 rounded-xl border space-y-2 ${isDarkMode ? "bg-[#111728] border-slate-800" : "bg-slate-50 border-slate-200"}`}
          >
            <span className="text-emerald-500 text-[11px] uppercase block">
              ✅ Total Target Approve สะสม
            </span>
            <div className="grid grid-cols-4 gap-2 text-center text-sm">
              {["KOE", "MER", "COM", "BA"].map((r) => (
                <div
                  key={r}
                  className={`p-2 rounded-lg border ${isDarkMode ? "bg-[#060A13] border-slate-800" : "bg-white border-slate-200"}`}
                >
                  <span className="text-[10px] text-slate-500 block">{r}</span>
                  <span
                    className={`font-mono text-base font-black ${isDarkMode ? "text-white" : "text-slate-900"}`}
                  >
                    {(globalTargetSum.approve as any)[r]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Target By Area Block */}
      <div
        className={`border rounded-2xl p-5 shadow-2xl space-y-4 transition-colors duration-300 ${isDarkMode ? "bg-[#0B132B] border-[#1C2541]" : "bg-white border-slate-200"}`}
      >
        <div
          className={`flex flex-col sm:flex-row items-center justify-between gap-3 border-b pb-3 ${isDarkMode ? "border-slate-800/60" : "border-slate-200"}`}
        >
          <div>
            <h4
              className={`text-sm font-black flex items-center gap-1.5 ${isDarkMode ? "text-white" : "text-slate-900"}`}
            >
              📍 Target by Area (คีย์และปรับแต่งรายพื้นที่)
            </h4>
            <p className="text-[10px] text-slate-400">
              ระบุหรือถอนรายชื่อเขตพื้นที่ปฏิบัติการเพื่อควบคุมเป้าหมายกำลังพลรายสาขา
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold">
            <select
              value={selectedAreaInput}
              onChange={(e) => setSelectedAreaInput(e.target.value)}
              className={`border px-2 py-1.5 rounded-xl outline-none font-bold ${isDarkMode ? "bg-[#111A36] border-[#222F54] text-slate-200" : "bg-slate-50 border-slate-200 text-slate-800"}`}
            >
              <option value="">เลือก Area เพื่อเพิ่ม Target</option>
              <option value="K01">K01</option>
              <option value="K02">K02</option>
              <option value="K03">K03</option>
              <option value="K04">K04</option>
              <option value="K05">K05</option>
              <option value="K06">K06</option>
            </select>
            <button
              onClick={handleAddNewAreaBlock}
              className={`flex items-center gap-1 border px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${isDarkMode ? "bg-[#1C2541] border-slate-700 text-white" : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"}`}
            >
              <Plus size={13} /> เพิ่ม Area
            </button>
          </div>
        </div>

        <div className="space-y-3 text-xs font-bold">
          {areaTargets.map((area, idx) => (
            <div
              key={area.id}
              className={`border rounded-xl p-4 space-y-3 ${isDarkMode ? "bg-[#111728] border-slate-800" : "bg-slate-50 border-slate-200"}`}
            >
              <div className="flex items-center justify-between">
                <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded font-black text-[10px]">
                  {area.name} Custom
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
                    <div className="grid grid-cols-4 gap-2 text-center">
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
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] text-emerald-600 font-bold block">
                      Target Approve
                    </span>
                    <div className="grid grid-cols-4 gap-2 text-center">
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
                    </div>
                  </div>

                  <div
                    className={`flex items-center gap-2 lg:col-span-2 pt-2 border-t text-[10px] ${isDarkMode ? "border-slate-800/40" : "border-slate-200"}`}
                  >
                    <button
                      onClick={() => handleCopyStructureValues(idx)}
                      className={`flex items-center gap-1 border px-3 py-1 rounded-lg transition-all ${isDarkMode ? "bg-[#1C2541] border-slate-700 text-slate-300" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                    >
                      <Copy size={11} /> คัดลอกจาก Target รวม
                    </button>
                    <button
                      onClick={() =>
                        setAreaTargets(
                          areaTargets.filter((t) => t.id !== area.id),
                        )
                      }
                      className="flex items-center gap-1 bg-red-600/10 text-red-500 border border-red-500/20 px-3 py-1 rounded-lg"
                    >
                      <Trash2 size={11} /> ลบ
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Counter Blocks */}
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
            <span className="text-[8px] bg-red-600/10 text-rose-400 px-1.5 py-0.5 rounded font-bold">
              -38.7% MoM
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
        {/* Chart 1: Status Distribution */}
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
                % %
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

        {/* Chart 2: Employee Type Distribution */}
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

        {/* Chart 3: Headcount Trend */}
        <div
          className={`border p-4 rounded-2xl shadow-xl space-y-2 lg:col-span-2 min-h-75 transition-colors duration-300 ${isDarkMode ? "bg-[#0B132B] border-[#1C2541]" : "bg-white border-slate-200"}`}
        >
          <h4
            className={`text-xs font-black uppercase ${isDarkMode ? "text-white" : "text-slate-900"}`}
          >
            Headcount Trend (% share per month)
          </h4>
          <div className="h-56 w-full text-xs font-bold relative block">
            {mounted ? (
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
                กำลังสร้างกราฟเส้น...
              </div>
            )}
          </div>
        </div>

        {/* Chart 4: Status Composition Over Time */}
        <div
          className={`border p-4 rounded-2xl shadow-xl space-y-2 lg:col-span-2 min-h-75 transition-colors duration-300 ${isDarkMode ? "bg-[#0B132B] border-[#1C2541]" : "bg-white border-slate-200"}`}
        >
          <h4
            className={`text-xs font-black uppercase ${isDarkMode ? "text-white" : "text-slate-900"}`}
          >
            Status Composition Over Time (%)
          </h4>
          <div className="h-56 w-full text-xs font-bold relative block">
            {mounted ? (
              <ResponsiveContainer width="100%" height={224}>
                <AreaChart
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
                  <Area
                    type="monotone"
                    dataKey="ปกติ"
                    stackId="1"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.15}
                  />
                  <Area
                    type="monotone"
                    dataKey="รอลงงาน"
                    stackId="1"
                    stroke="#38bdf8"
                    fill="#38bdf8"
                    fillOpacity={0.15}
                  />
                  <Area
                    type="monotone"
                    dataKey="สรรหา"
                    stackId="1"
                    stroke="#f59e0b"
                    fill="#f59e0b"
                    fillOpacity={0.15}
                  />
                  <Area
                    type="monotone"
                    dataKey="แจ้งลาออก"
                    stackId="1"
                    stroke="#f43f5e"
                    fill="#f43f5e"
                    fillOpacity={0.15}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex items-center justify-center text-slate-400 text-xs py-12">
                กำลังประมวลผลไทม์ไลน์...
              </div>
            )}
          </div>
        </div>

        {/* Chart 5: Employees by Area */}
        <div
          className={`border p-4 rounded-2xl shadow-xl space-y-2 lg:col-span-2 min-h-75 transition-colors duration-300 ${isDarkMode ? "bg-[#0B132B] border-[#1C2541]" : "bg-white border-slate-200"}`}
        >
          <h4
            className={`text-xs font-black uppercase ${isDarkMode ? "text-white" : "text-slate-900"}`}
          >
            Employees by Area (%) จากกลุ่ม Filter ที่เลือก
          </h4>
          <div className="h-56 w-full text-xs font-bold relative block">
            {mounted && barChartAreaProps.length > 0 ? (
              <ResponsiveContainer width="100%" height={224}>
                <BarChart
                  data={barChartAreaProps}
                  margin={{ left: -20, right: 10, top: 10 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke={isDarkMode ? "#1C2541" : "#e2e8f0"}
                  />
                  <XAxis dataKey="name" stroke="#64748b" />
                  <YAxis stroke="#64748b" unit="%" />
                  <RechartsTooltip
                    formatter={(value, name, props: any) => [
                      `${value}% (${props.payload.count} ราย)`,
                      "สัดส่วน",
                    ]}
                  />
                  <Bar
                    dataKey="percentage"
                    name="Area Proportion"
                    radius={[5, 5, 0, 0]}
                  >
                    {barChartAreaProps.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={BAR_COLORS[index % BAR_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex items-center justify-center text-slate-400 text-xs py-12">
                ไม่มีข้อมูลกราฟแท่งรายพื้นที่เพื่อแสดงผล
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
                    key={item.con || idx}
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

        {/* Table Pagination */}
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
                  onClick={() => {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
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
              <li>
                <span
                  className={`flex items-center gap-2 cursor-pointer font-bold ${isDarkMode ? "text-slate-300 hover:text-white" : "text-slate-600 hover:text-slate-900"}`}
                >
                  <Download size={13} className="text-slate-400" /> Export
                  Reports
                </span>
              </li>
              <li>
                <span
                  className={`flex items-center gap-2 cursor-pointer font-bold ${isDarkMode ? "text-slate-300 hover:text-white" : "text-slate-600 hover:text-slate-900"}`}
                >
                  <HelpCircle size={13} className="text-slate-400" /> Help &
                  Support
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
                <MapPin size={13} className="text-slate-400 shrink-0" />{" "}
                Bangkok, Thailand
              </li>
              <li
                className={`flex items-center gap-2 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}
              >
                <Mail size={13} className="text-slate-400 shrink-0" />{" "}
                Niwat_wiy@riverpro.co.th
              </li>
              <li
                className={`flex items-center gap-2 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}
              >
                <Phone size={13} className="text-slate-400 shrink-0" /> +66 (0)
                65-806-4694
              </li>
            </ul>
            <div className="flex items-center gap-2 pt-2">
              <div
                className={`p-2 rounded-full cursor-pointer border transition-colors ${isDarkMode ? "bg-[#060A13] border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800" : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200"}`}
              >
                <Globe size={13} />
              </div>
              <div
                className={`p-2 rounded-full cursor-pointer border transition-colors ${isDarkMode ? "bg-[#060A13] border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800" : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200"}`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </div>
              <div
                className={`p-2 rounded-full cursor-pointer border transition-colors ${isDarkMode ? "bg-[#060A13] border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800" : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200"}`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                  <rect width="4" height="12" x="2" y="9" />
                  <circle cx="4" cy="4" r="2" />
                </svg>
              </div>
              <div
                className={`p-2 rounded-full cursor-pointer border transition-colors ${isDarkMode ? "bg-[#060A13] border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800" : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200"}`}
              >
                <ExternalLink size={13} />
              </div>
            </div>
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
