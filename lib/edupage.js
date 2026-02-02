import crypto from "crypto";

const BASE = "https://ttpu.edupage.org";
const YEAR = 2025; // Could be dynamic
const COOKIE = process.env.EDUPAGE_COOKIE || "";

const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");

async function postJson(path, body, referer) {
  const r = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "accept": "*/*",
      "content-type": "application/json; charset=UTF-8",
      "origin": BASE,
      "referer": referer,
      ...(COOKIE ? { cookie: COOKIE } : {}),
    },
    body: JSON.stringify(body),
    // Revalidation for Next.js caching. 
    // Set to 1 hour (3600), or adjust as needed.
    next: { revalidate: 3600 } 
  });

  const text = await r.text();
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${text.slice(0, 200)}`);
  return JSON.parse(text);
}

async function getCurrentTtNum() {
  const j = await postJson(
    "/timetable/server/ttviewer.js?__func=getTTViewerData",
    { __args: [null, YEAR], __gsh: "00000000" },
    `${BASE}/`
  );
  const defaultNum = j?.r?.regular?.default_num;
  if (defaultNum) return String(defaultNum);

  const timetables = j?.r?.regular?.timetables || [];
  const today = new Date().toISOString().slice(0, 10);
  const best = timetables
    .filter((t) => t?.datefrom && t.datefrom <= today)
    .sort((a, b) => (a.datefrom < b.datefrom ? 1 : -1))[0];

  if (best?.tt_num) return String(best.tt_num);
  if (timetables[0]?.tt_num) return String(timetables[0].tt_num);

  throw new Error("Cannot determine tt_num");
}

async function fetchRaw(ttNum) {
  return await postJson(
    "/timetable/server/regulartt.js?__func=regularttGetData",
    { __args: [null, String(ttNum)], __gsh: "00000000" },
    `${BASE}/timetable/`
  );
}

function normalizeAndFilter(raw, weekTtNum, className) {
  const tables = raw?.r?.dbiAccessorRes?.tables || [];
  const byId = Object.fromEntries(tables.map((t) => [t.id, t]));
  const rows = (id) => byId[id]?.data_rows || [];
  const mapById = (id) =>
    Object.fromEntries(rows(id).map((r) => [String(r.id), r]));

  const lessons = mapById("lessons");
  const subjects = mapById("subjects");
  const teachers = mapById("teachers");
  const groups = mapById("groups");
  const rooms = mapById("classrooms");
  const periods = mapById("periods");
  const classes = mapById("classes");
  const dayNameByIndex = Object.fromEntries(
    rows("days").map((d) => [Number(d.id), d.name])
  );

  const q = className.toLowerCase();
  const allowedClassIds = new Set(
    Object.values(classes)
      .filter((c) => (c?.name || "").toLowerCase().includes(q))
      .map((c) => String(c.id))
  );

  const toArr = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);

  const teacherName = (t) => {
    if (!t) return null;
    const full = `${t.nameprefix || ""} ${t.name || ""} ${t.namesuffix || ""}`
      .replace(/\s+/g, " ")
      .trim();
    return full || t.short || null;
  };

  const periodTime = (periodStr) => {
    const p = periods[String(periodStr)];
    return { start: p?.starttime ?? null, end: p?.endtime ?? null };
  };

  const decodeMask = (mask) => {
    if (!mask) return [];
    const s = String(mask);
    const out = [];
    for (let i = 0; i < s.length; i++) if (s[i] === "1") out.push(i + 1);
    return out;
  };

  const lessonMatchesClass = (lesson) => {
    const cids = toArr(lesson.classids).map(String);
    return cids.some((id) => allowedClassIds.has(id));
  };

  const out = [];
  for (const c of rows("cards")) {
    const lesson = lessons[String(c.lessonid)];
    if (!lesson) continue;
    if (!lessonMatchesClass(lesson)) continue;

    const subj = subjects[String(lesson.subjectid)];
    const subjectName = subj?.name ?? String(lesson.subjectid);

    const teacherNames = toArr(lesson.teacherids)
      .map((id) => teacherName(teachers[String(id)]) ?? String(id))
      .filter(Boolean);

    const groupNames = toArr(lesson.groupids)
      .map((id) => groups[String(id)]?.name ?? String(id))
      .filter(Boolean);

    const roomNames = toArr(c.classroomids)
      .map((id) => rooms[String(id)]?.name ?? String(id))
      .filter(Boolean);

    const { start, end } = periodTime(c.period);
    const dayIdxs = decodeMask(c.days);

    for (const dayIdx of dayIdxs) {
      out.push({
        week_tt_num: String(weekTtNum),
        class: className,
        day_index: dayIdx,
        day: dayNameByIndex[dayIdx] ?? `Day${dayIdx}`,
        period: Number(c.period),
        start,
        end,
        subject: subjectName,
        teachers: teacherNames,
        groups: groupNames,
        rooms: roomNames,
        _ids: { cardId: String(c.id), lessonId: String(c.lessonid) },
      });
    }
  }

  out.sort(
    (a, b) =>
      a.day_index - b.day_index ||
      a.period - b.period ||
      a.subject.localeCompare(b.subject)
  );
  return out;
}

/**
 * Fetches the timetable for a given class.
 * @param {string} className The class name (e.g. "SE-22")
 * @returns {Promise<Array>} The normalized timetable
 */
export async function getEdupageTimetable(className = "SE-22") {
  try {
    const ttNum = await getCurrentTtNum();
    const raw = await fetchRaw(ttNum);
    const normalized = normalizeAndFilter(raw, ttNum, className);
    return normalized;
  } catch (e) {
    console.error("Edupage sync failed:", e);
    throw e;
  }
}
