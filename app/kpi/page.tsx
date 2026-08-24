"use client";

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
  RefreshCw,
  Award,
  AlertTriangle,
  Clock,
  Printer,
  FileText,
  Search,
} from "lucide-react";

const STATUS_BADGES: any = {
  ปกติ: "bg-emerald-950/40 text-emerald-400 border border-emerald-500/20",
  รอลงงาน: "bg-sky-950/40 text-sky-400 border border-sky-500/20",
  ระงับการใช้งาน: "bg-slate-900/60 text-slate-400 border border-slate-700/30",
  สรรหา: "bg-amber-950/40 text-amber-400 border border-amber-500/20",
  แจ้งลาออก: "bg-rose-950/40 text-rose-400 border border-rose-500/20",
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

// Utility Function
const parseStampDate = (dateStr: any): Date | null => {
  if (!dateStr || typeof dateStr !== "string") return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  let parsedDate: Date;
  const parts = trimmed.split("-");

  if (parts.length === 3 && parts[0].length === 2 && parts[2].length === 4) {
    parsedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  } else {
    parsedDate = new Date(trimmed);
  }

  if (isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
};

export default function KPIDashboard() {
  const [rawData, setRawData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isMounted, setIsMounted] = useState(false);

  // Dynamic Filters Config
  const [filterYear, setFilterYear] = useState("All Year");
  const [filterMonth, setFilterMonth] = useState("All Month");
  const [filterArea, setFilterArea] = useState("All Area");
  const [filterAreaCode, setFilterAreaCode] = useState("All Area Code");
  const [filterRole, setFilterRole] = useState("All Role");
  const [filterStatus, setFilterStatus] = useState("All Status");
  const [dateFrom, setDateFrom] = useState("2026-02-20");
  const [dateTo, setDateTo] = useState("2026-06-19");

  const [searchTableTerm, setSearchTableTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const evaluationDate = useMemo(
    () => parseStampDate(dateTo) || new Date(),
    [dateTo],
  );

  const [areaTargets, setAreaTargets] = useState<any[]>([
    { id: "K01", name: "K01", approve: { KOE: 1, MER: 11, COM: 0, BA: 1 } },
    { id: "K02", name: "K02", approve: { KOE: 1, MER: 9, COM: 0, BA: 0 } },
    { id: "K03", name: "K03", approve: { KOE: 1, MER: 5, COM: 0, BA: 1 } },
    { id: "K04", name: "K04", approve: { KOE: 1, MER: 5, COM: 0, BA: 1 } },
    { id: "K05", name: "K05", approve: { KOE: 1, MER: 8, COM: 0, BA: 1 } },
    { id: "K06", name: "K06", approve: { KOE: 1, MER: 5, COM: 0, BA: 0 } },
    { id: "K07", name: "K07", approve: { KOE: 1, MER: 7, COM: 0, BA: 0 } },
    { id: "K08", name: "K08", approve: { KOE: 1, MER: 10, COM: 0, BA: 0 } },
    { id: "K09", name: "K09", approve: { KOE: 1, MER: 13, COM: 2, BA: 1 } },
    { id: "K10", name: "K10", approve: { KOE: 1, MER: 13, COM: 2, BA: 2 } },
  ]);

  useEffect(() => {
    setIsMounted(true);
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase
        .from("data_app")
        .select("*");
      if (error) throw error;
      setRawData(result || []);

      const { data: targetRows, error: targetError } = await supabase
        .from("area_targets")
        .select("area, role, target_approve");

      if (!targetError && targetRows && targetRows.length > 0) {
        const baseMap: Record<string, any> = {
          K01: {
            id: "K01",
            name: "K01",
            approve: { KOE: 0, MER: 0, COM: 0, BA: 0 },
          },
          K02: {
            id: "K02",
            name: "K02",
            approve: { KOE: 0, MER: 0, COM: 0, BA: 0 },
          },
          K03: {
            id: "K03",
            name: "K03",
            approve: { KOE: 0, MER: 0, COM: 0, BA: 0 },
          },
          K04: {
            id: "K04",
            name: "K04",
            approve: { KOE: 0, MER: 0, COM: 0, BA: 0 },
          },
          K05: {
            id: "K05",
            name: "K05",
            approve: { KOE: 0, MER: 0, COM: 0, BA: 0 },
          },
          K06: {
            id: "K06",
            name: "K06",
            approve: { KOE: 0, MER: 0, COM: 0, BA: 0 },
          },
          K07: {
            id: "K07",
            name: "K07",
            approve: { KOE: 0, MER: 0, COM: 0, BA: 0 },
          },
          K08: {
            id: "K08",
            name: "K08",
            approve: { KOE: 0, MER: 0, COM: 0, BA: 0 },
          },
          K09: {
            id: "K09",
            name: "K09",
            approve: { KOE: 0, MER: 0, COM: 0, BA: 0 },
          },
          K10: {
            id: "K10",
            name: "K10",
            approve: { KOE: 0, MER: 0, COM: 0, BA: 0 },
          },
        };

        targetRows.forEach((row: any) => {
          const areaKey = row.area
            ? row.area.toString().trim().toUpperCase()
            : "";
          const roleKey = row.role
            ? row.role.toString().trim().toUpperCase()
            : "";
          const approveValue = row.target_approve || 0;

          if (baseMap[areaKey] && baseMap[areaKey].approve) {
            baseMap[areaKey].approve[roleKey] = approveValue;
          }
        });

        setAreaTargets(Object.values(baseMap));
      }
    } catch (error: any) {
      console.error("Fetch Error:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const personPenaltyMap = useMemo(() => {
    const map: Record<string, number> = {};
    const groups: Record<string, any[]> = {};

    rawData.forEach((item) => {
      if (item.fullname && ["MER", "COM", "BA"].includes(item.employee_type)) {
        if (!groups[item.fullname]) groups[item.fullname] = [];
        groups[item.fullname].push(item);
      }
    });

    Object.keys(groups).forEach((name) => {
      const personRows = groups[name].sort((a, b) => {
        const dA = parseStampDate(a.date_stamp)?.getTime() || 0;
        const dB = parseStampDate(b.date_stamp)?.getTime() || 0;
        return dA - dB;
      });

      let totalPenalty = 0;
      let inPenaltyCycle = false;
      let cycleStartDate: Date | null = null;

      personRows.forEach((row) => {
        const rowDate = parseStampDate(row.date_stamp);
        if (!rowDate) return;

        if (row.status_app === "แจ้งลาออก" || row.status_app === "สรรหา") {
          if (!inPenaltyCycle) {
            inPenaltyCycle = true;
            cycleStartDate = rowDate;
          }
        } else if (row.status_app === "ปกติ") {
          if (inPenaltyCycle && cycleStartDate) {
            const diffTime = rowDate.getTime() - cycleStartDate.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays > 15) {
              totalPenalty += Math.min(diffDays - 15, 30);
            }
            inPenaltyCycle = false;
            cycleStartDate = null;
          }
        }
      });

      if (inPenaltyCycle && cycleStartDate) {
        const diffTime = evaluationDate.getTime() - cycleStartDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 15) {
          totalPenalty += Math.min(diffDays - 15, 30);
        }
      }
      map[name] = totalPenalty;
    });

    return map;
  }, [rawData, evaluationDate]);

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
    setFilterStatus("All Status");
    setSearchTableTerm("");
    setCurrentPage(1);
  };

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
      if (filterStatus !== "All Status" && item.status_app !== filterStatus)
        return false;

      if (item.date_stamp) {
        const targetDate = parseStampDate(item.date_stamp);
        if (targetDate) {
          const formatted = targetDate.toISOString().split("T")[0];
          if (formatted < dateFrom || formatted > dateTo) return false;
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
    filterStatus,
    dateFrom,
    dateTo,
  ]);

  const summaryMetrics = useMemo(() => {
    const opsStaffRows = filteredData.filter((d) =>
      ["MER", "COM", "BA"].includes(d.employee_type),
    );
    const activeOps = new Set(
      opsStaffRows
        .filter((d) => d.status_app === "ปกติ")
        .map((d) => d.fullname),
    ).size;

    const targetOpsTotal = areaTargets
      .filter((t) => filterArea === "All Area" || t.name === filterArea)
      .reduce(
        (sum, t) => sum + (t.approve.MER + t.approve.COM + t.approve.BA),
        0,
      );

    const baseKpi = targetOpsTotal > 0 ? (activeOps / targetOpsTotal) * 100 : 0;

    const uniquePeopleGlobal = Array.from(
      new Set(opsStaffRows.map((d) => d.fullname)),
    );
    let totalGlobalPenalty = 0;
    uniquePeopleGlobal.forEach((name) => {
      totalGlobalPenalty += personPenaltyMap[name] || 0;
    });

    const avgPenalty =
      uniquePeopleGlobal.length > 0
        ? parseFloat(
            (totalGlobalPenalty / uniquePeopleGlobal.length).toFixed(2),
          )
        : 0;
    const finalKpi = Math.max(parseFloat((baseKpi - avgPenalty).toFixed(1)), 0);

    return {
      targetTotal: targetOpsTotal,
      activeOps,
      baseKpi: parseFloat(baseKpi.toFixed(1)),
      avgPenalty,
      finalKpi,
    };
  }, [filteredData, areaTargets, filterArea, personPenaltyMap]);

  const areaKPIScorecards = useMemo(() => {
    return areaTargets
      .map((targetArea) => {
        const areaFullStaff = filteredData.filter(
          (d) => d.area === targetArea.name,
        );
        const areaOpsActive = new Set(
          areaFullStaff
            .filter(
              (d) =>
                d.status_app === "ปกติ" &&
                ["MER", "COM", "BA"].includes(d.employee_type),
            )
            .map((d) => d.fullname),
        ).size;
        const targetApproveCount =
          targetArea.approve.MER +
          targetArea.approve.COM +
          targetArea.approve.BA;
        const baseScore =
          targetApproveCount > 0
            ? (areaOpsActive / targetApproveCount) * 100
            : 0;

        const uniquePeopleInArea = Array.from(
          new Set(
            areaFullStaff
              .filter((d) => ["MER", "COM", "BA"].includes(d.employee_type))
              .map((d) => d.fullname),
          ),
        );
        let totalAreaPenalty = 0;
        uniquePeopleInArea.forEach((name) => {
          totalAreaPenalty += personPenaltyMap[name] || 0;
        });

        const areaAvgPenalty =
          uniquePeopleInArea.length > 0
            ? totalAreaPenalty / uniquePeopleInArea.length
            : 0;
        const adjustedScore = Math.max(
          parseFloat((baseScore - areaAvgPenalty).toFixed(1)),
          0,
        );

        let grade = "F";
        let colorClass = "text-rose-400";
        if (adjustedScore >= 90) {
          grade = "A";
          colorClass = "text-emerald-400";
        } else if (adjustedScore >= 80) {
          grade = "B";
          colorClass = "text-teal-400";
        } else if (adjustedScore >= 70) {
          grade = "C";
          colorClass = "text-amber-400";
        } else if (adjustedScore >= 50) {
          grade = "D";
          colorClass = "text-orange-400";
        }

        return {
          ...targetArea,
          targetApproveCount,
          areaOpsActive,
          baseScore: parseFloat(baseScore.toFixed(1)),
          areaAvgPenalty: parseFloat(areaAvgPenalty.toFixed(2)),
          adjustedScore,
          grade,
          colorClass,
        };
      })
      .filter((item) => filterArea === "All Area" || item.name === filterArea);
  }, [filteredData, areaTargets, filterArea, personPenaltyMap]);

  const searchedRows = useMemo(() => {
    return [...filteredData].filter((item) => {
      if (!searchTableTerm) return true;
      const term = searchTableTerm.toLowerCase();
      return (
        item.fullname?.toLowerCase().includes(term) ||
        item.employee_id?.toString().includes(term) ||
        item.area_code?.toLowerCase().includes(term)
      );
    });
  }, [filteredData, searchTableTerm]);

  const currentTableData = useMemo(() => {
    const indexOfLastRow = currentPage * rowsPerPage;
    const indexOfFirstRow = indexOfLastRow - rowsPerPage;
    return searchedRows.slice(indexOfFirstRow, indexOfLastRow);
  }, [searchedRows, currentPage]);

  const totalPagesCount = Math.ceil(searchedRows.length / rowsPerPage);

  return (
    <div className="min-h-screen bg-[#060608] text-white p-4 md:p-8 space-y-6 font-sans select-none print:bg-white print:text-black print:p-0">
      {/* SCREEN VIEW */}
      <div className="print:hidden space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-blue-400 uppercase tracking-wider flex items-center gap-2">
              <Award size={24} className="text-yellow-400" /> KPI Scoring Room
            </h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5 tracking-widest">
              Fulfillment and Turnover scale penalty engine
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-[#0D0D10] border border-white/10 px-4 py-1.5 rounded-xl font-mono text-xs flex items-center gap-2 text-slate-300">
              <Clock size={13} className="text-blue-400 animate-pulse" />
              <span>
                {isMounted ? currentTime.toLocaleDateString("th-TH") : "..."}
              </span>
              <span className="text-blue-400 font-bold">
                {isMounted ? currentTime.toLocaleTimeString("th-TH") : "..."}
              </span>
            </div>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer"
            >
              <Printer size={13} /> พิมพ์รายงานส่งบัญชี
            </button>

            <button
              onClick={fetchData}
              className="flex items-center gap-2 border border-white/10 px-4 py-2 rounded-xl text-xs font-bold hover:bg-white/5 text-slate-300 cursor-pointer"
            >
              <RefreshCw
                size={13}
                className={loading ? "animate-spin text-blue-400" : ""}
              />{" "}
              คำนวณบอร์ดด่วน
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-[#0D0D10] border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-bold">
            <div>
              <label className="block text-slate-500 mb-1.5 uppercase text-[9px]">
                Year
              </label>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="w-full border border-white/10 rounded-xl px-3 py-2 bg-[#121216] text-white font-black outline-none"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-500 mb-1.5 uppercase text-[9px]">
                Month
              </label>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="w-full border border-white/10 rounded-xl px-3 py-2 bg-[#121216] text-white font-black outline-none"
              >
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    {m === "All Month" ? m : MONTH_NAMES[m] || `Month ${m}`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-500 mb-1.5 uppercase text-[9px]">
                Area
              </label>
              <select
                value={filterArea}
                onChange={(e) => setFilterArea(e.target.value)}
                className="w-full border border-white/10 rounded-xl px-3 py-2 bg-[#121216] text-white font-black outline-none"
              >
                {availableAreas.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-500 mb-1.5 uppercase text-[9px]">
                Area Code
              </label>
              <select
                value={filterAreaCode}
                onChange={(e) => setFilterAreaCode(e.target.value)}
                className="w-full border border-white/10 rounded-xl px-3 py-2 bg-[#121216] text-white font-black outline-none"
              >
                {availableAreaCodes.map((ac) => (
                  <option key={ac} value={ac}>
                    {ac}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 text-xs font-bold pt-1">
            <div className="w-full sm:w-1/4">
              <label className="block text-slate-500 mb-1.5 uppercase text-[9px]">
                Date From
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full border border-white/10 rounded-xl px-3 py-1.5 bg-[#121216] text-white font-black outline-none"
              />
            </div>
            <div className="w-full sm:w-1/4">
              <label className="block text-slate-500 mb-1.5 uppercase text-[9px]">
                Date To
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full border border-white/10 rounded-xl px-3 py-1.5 bg-[#121216] text-white font-black outline-none"
              />
            </div>
            <button
              onClick={handleClearAllFilters}
              className="border border-white/10 px-4 py-2 rounded-xl bg-[#17171E] text-slate-300 self-end h-9 mt-1 hover:bg-white/5 transition-colors cursor-pointer"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Counter Blocks */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="bg-[#0D0D10] border border-white/10 p-4 rounded-xl">
            <p className="text-slate-500 text-[9px] uppercase font-bold tracking-wider">
              Target Approve (MER,COM,BA)
            </p>
            <h2 className="text-xl font-black font-mono text-slate-300 mt-1">
              {summaryMetrics.targetTotal} ราย
            </h2>
          </div>
          <div className="bg-[#0D0D10] border border-white/10 p-4 rounded-xl">
            <p className="text-slate-500 text-[9px] uppercase font-bold tracking-wider">
              {'Actual "ปกติ" (MER,COM,BA)'}
            </p>
            <h2 className="text-xl font-black font-mono text-emerald-400 mt-1">
              {summaryMetrics.activeOps} คน
            </h2>
          </div>
          <div className="bg-[#0D0D10] border border-white/10 p-4 rounded-xl">
            <p className="text-slate-500 text-[9px] uppercase font-bold tracking-wider">
              Base KPI Score (%)
            </p>
            <h2 className="text-xl font-black font-mono text-white mt-1">
              {summaryMetrics.baseKpi}%
            </h2>
          </div>
          <div className="bg-[#0D0D10] border border-white/10 p-4 rounded-xl border-l-4 border-l-rose-500">
            <p className="text-rose-400 text-[9px] uppercase font-bold tracking-wider flex items-center gap-1">
              <AlertTriangle size={10} /> Avg Scale Penalty
            </p>
            <h2 className="text-xl font-black font-mono text-rose-400 mt-1">
              -{summaryMetrics.avgPenalty}
            </h2>
          </div>
          <div className="bg-[#0D0D10] border border-white/10 p-4 rounded-xl border-l-4 border-l-yellow-500 col-span-2 lg:col-span-1">
            <p className="text-yellow-400 text-[9px] uppercase font-bold tracking-wider">
              Final Adjusted KPI
            </p>
            <h2 className="text-xl font-black font-mono text-yellow-400 mt-1">
              {summaryMetrics.finalKpi}%
            </h2>
          </div>
        </div>

        {/* Tables Section */}
        <div className="bg-[#0D0D10] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-4 bg-[#121217] border-b border-white/5">
            <h3 className="text-xs font-black uppercase text-white tracking-wider">
              ตารางสรุปคะแนนประเมิน KPI & Scale Turnover Deduction รายพื้นที่
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-bold">
              <thead>
                <tr className="bg-[#0A0A0D] text-slate-400 uppercase text-[9px] border-b border-white/10">
                  <th className="px-5 py-3.5">Area</th>
                  <th className="px-5 py-3.5 text-center">Approved Target</th>
                  <th className="px-5 py-3.5 text-center">
                    Actual Active (คน)
                  </th>
                  <th className="px-5 py-3.5 text-center">Base Score</th>
                  <th className="px-5 py-3.5 text-center text-rose-400">
                    Avg Scale Penalty
                  </th>
                  <th className="px-5 py-3.5 text-center text-yellow-400">
                    Adjusted Score
                  </th>
                  <th className="px-5 py-3.5 text-center">Grade Eval</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {areaKPIScorecards.map((area, idx) => (
                  <tr key={idx} className="hover:bg-white/2">
                    <td className="px-5 py-3.5 text-white font-black">
                      {area.name} Area
                    </td>
                    <td className="px-5 py-3.5 text-center font-mono">
                      {area.targetApproveCount} ราย
                    </td>
                    <td className="px-5 py-3.5 text-center font-mono text-emerald-400">
                      {area.areaOpsActive} คน
                    </td>
                    <td className="px-5 py-3.5 text-center font-mono">
                      {area.baseScore}%
                    </td>
                    <td className="px-5 py-3.5 text-center font-mono text-rose-400">
                      -{area.areaAvgPenalty}
                    </td>
                    <td className="px-5 py-3.5 text-center font-mono font-black text-yellow-400 text-sm">
                      {area.adjustedScore}%
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={`px-2.5 py-0.5 bg-white/5 rounded-md border border-white/5 ${area.colorClass}`}
                      >
                        Grade {area.grade}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ทำเนียบพนักงาน */}
        <div className="bg-[#0D0D10] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-4 bg-[#121217] border-b border-white/5 flex items-center justify-between">
            <div className="relative w-full sm:w-72">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                <Search size={13} />
              </span>
              <input
                type="text"
                value={searchTableTerm}
                onChange={(e) => setSearchTableTerm(e.target.value)}
                placeholder="ค้นหาชื่อ หรือรหัสพื้นที่..."
                className="w-full border border-white/10 rounded-xl pl-9 pr-4 py-1.5 text-xs outline-none bg-[#0A0A0D] text-white"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-bold">
              <thead>
                <tr className="border-b border-white/10 bg-[#0A0A0D] text-slate-400 uppercase text-[9px]">
                  <th className="px-5 py-4">Full Name</th>
                  <th className="px-5 py-4">Type</th>
                  <th className="px-5 py-4">Area Code</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Date Stamp</th>
                  <th className="px-5 py-4 text-center text-rose-400">
                    Scale Penalty
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {currentTableData.map((item, idx) => {
                  const itemPenalty = personPenaltyMap[item.fullname] || 0;
                  return (
                    <tr key={idx} className="hover:bg-white/2">
                      <td className="px-5 py-3.5 text-white font-black">
                        {item.fullname || "-"}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-400 text-[11px]">
                        {item.employee_type || "-"}
                      </td>
                      <td className="px-5 py-3.5 text-blue-400 font-mono">
                        {item.area || "-"}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] border font-black uppercase ${STATUS_BADGES[item.status_app] || "bg-white/5 text-white border-white/10"}`}
                        >
                          {item.status_app || "N/A"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 font-mono">
                        {item.date_stamp || "-"}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {itemPenalty > 0 ? (
                          <span className="bg-rose-500/10 border border-rose-500/20 text-rose-400 font-mono px-2 py-0.5 rounded flex items-center justify-center gap-1 max-w-28 mx-auto text-[11px] font-black">
                            -{itemPenalty} แต้ม
                          </span>
                        ) : (
                          <span className="text-slate-600 font-mono">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400 bg-[#0A0A0D]">
            <span>
              Showing{" "}
              {searchedRows.length > 0
                ? (currentPage - 1) * rowsPerPage + 1
                : 0}
              -{Math.min(currentPage * rowsPerPage, searchedRows.length)} of{" "}
              {searchedRows.length} รายการ
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-2 py-1 rounded-lg border border-white/10 text-white hover:bg-white/5 disabled:opacity-40 cursor-pointer"
              >
                ‹
              </button>
              <span className="px-3 py-1 rounded-lg border border-white/10 font-mono bg-[#121217] text-white">
                {currentPage} / {totalPagesCount || 1}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(p + 1, totalPagesCount))
                }
                disabled={
                  currentPage === totalPagesCount || totalPagesCount === 0
                }
                className="px-2 py-1 rounded-lg border border-white/10 text-white hover:bg-white/5 disabled:opacity-40 cursor-pointer"
              >
                ›
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* PRINT VIEW TEMPLATE */}
      <div className="hidden print:block text-black bg-white p-0 break-inside-avoid">
        <div className="flex justify-between items-start border-b-2 border-black pb-2 mb-3">
          <div>
            <h2 className="text-base font-black tracking-tight flex items-center gap-1.5">
              <FileText size={16} /> รายงานผลการประเมินกำลังพลและคะแนน KPI
              รายพื้นที่
            </h2>
            <p className="text-[11px] text-gray-600">
              (Manpower Performance Summary & Expenses Verification Report)
            </p>
          </div>
          <div className="text-right text-[11px] space-y-0.5">
            <p>
              <span className="font-bold">วันที่ประเมินหลักฐาน:</span> {dateTo}
            </p>
            <p>
              <span className="font-bold">วันที่พิมพ์รายงาน:</span>{" "}
              {isMounted ? currentTime.toLocaleDateString("th-TH") : "-"}
            </p>
          </div>
        </div>

        {/* ตารางข้อมูลสำหรับหน้าพิมพ์ */}
        <table className="w-full text-left border-collapse text-[11px] border border-gray-300">
          <thead>
            <tr className="bg-gray-100 border-b-2 border-black text-black">
              <th className="px-3 py-1 border-r border-gray-300">Area</th>
              <th className="px-3 py-1 text-center border-r border-gray-300">
                Approved Target
              </th>
              <th className="px-3 py-1 text-center border-r border-gray-300">
                Actual Active
              </th>
              <th className="px-3 py-1 text-center border-r border-gray-300">
                Base Score
              </th>
              <th className="px-3 py-1 text-center border-r border-gray-300">
                Avg Scale Penalty
              </th>
              <th className="px-3 py-1 text-center border-r border-gray-300">
                Adjusted Score
              </th>
              <th className="px-3 py-1 text-center">Grade Eval</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {areaKPIScorecards.map((area, idx) => (
              <tr key={idx} className="text-black">
                <td className="px-3 py-1 font-bold border-r border-gray-300">
                  {area.name} Area
                </td>
                <td className="px-3 py-1 text-center border-r border-gray-300">
                  {area.targetApproveCount} ราย
                </td>
                <td className="px-3 py-1 text-center border-r border-gray-300">
                  {area.areaOpsActive} คน
                </td>
                <td className="px-3 py-1 text-center border-r border-gray-300">
                  {area.baseScore}%
                </td>
                <td className="px-3 py-1 text-center border-r border-gray-300">
                  -{area.areaAvgPenalty}
                </td>
                <td className="px-3 py-1 text-center font-bold border-r border-gray-300">
                  {area.adjustedScore}%
                </td>
                <td className="px-3 py-1 text-center font-bold">
                  Grade {area.grade}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* สรุปข้อมูลรวม */}
        <div className="mt-3 flex justify-end">
          <div className="w-56 border border-black p-2.5 text-[11px]">
            <div className="flex justify-between mb-1">
              <span className="font-bold">Total Base Target:</span>
              <span>{summaryMetrics.targetTotal}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="font-bold">Total Active:</span>
              <span>{summaryMetrics.activeOps}</span>
            </div>
            <div className="flex justify-between border-t border-dashed border-gray-400 pt-1 font-bold text-xs">
              <span>Overall KPI:</span>
              <span>{summaryMetrics.finalKpi}%</span>
            </div>
          </div>
        </div>

        {/* ส่วนลายเซ็นอนุมัติ (Signature Section) */}
        <div className="mt-4 grid grid-cols-3 gap-6 text-center text-[11px] break-inside-avoid">
          <div className="space-y-1">
            <p className="font-bold">ผู้จัดทำ (Prepared By)</p>
            <div className="h-8"></div>
            <p>....................................................</p>
            <p className="text-gray-600">(________________________)</p>
            <p className="text-[10px] text-gray-500">
              วันที่ ......./......./.......
            </p>
          </div>
          <div className="space-y-1">
            <p className="font-bold">ผู้ตรวจสอบ (Checked By)</p>
            <div className="h-8"></div>
            <p>....................................................</p>
            <p className="text-gray-600">(________________________)</p>
            <p className="text-[10px] text-gray-500">
              วันที่ ......./......./.......
            </p>
          </div>
          <div className="space-y-1">
            <p className="font-bold">ผู้อนุมัติ (Approved By)</p>
            <div className="h-8"></div>
            <p>....................................................</p>
            <p className="text-gray-600">(________________________)</p>
            <p className="text-[10px] text-gray-500">
              วันที่ ......./......./.......
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
