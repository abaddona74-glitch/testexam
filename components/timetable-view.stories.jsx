import { TimetableView } from './timetable-view';

// Example timetable data simulating SE-22 schedule
const sampleTimetable = [
  { day_index: 1, period: 1, start: '08:00', end: '08:50', subject: 'Data Mining', teachers: ['Dr. Karimov'], rooms: ['301'] },
  { day_index: 1, period: 2, start: '09:00', end: '09:50', subject: 'Data Mining', teachers: ['Dr. Karimov'], rooms: ['301'] },
  { day_index: 1, period: 3, start: '10:00', end: '10:50', subject: 'Data structures and algorithms', teachers: ['Prof. Yusupov'], rooms: ['205'] },
  { day_index: 1, period: 4, start: '11:00', end: '11:50', subject: 'Data structures and algorithms', teachers: ['Prof. Yusupov'], rooms: ['205'] },
  { day_index: 2, period: 1, start: '08:00', end: '08:50', subject: 'Database', teachers: ['Dr. Tursunov'], rooms: ['Lab-1'] },
  { day_index: 2, period: 2, start: '09:00', end: '09:50', subject: 'Database', teachers: ['Dr. Tursunov'], rooms: ['Lab-1'] },
  { day_index: 2, period: 5, start: '12:00', end: '12:50', subject: 'Human-computer interaction', teachers: ['Prof. Rahimova'], rooms: ['402'] },
  { day_index: 3, period: 1, start: '08:00', end: '08:50', subject: 'Software Project Management', teachers: ['Dr. Aliyev'], rooms: ['306'] },
  { day_index: 3, period: 2, start: '09:00', end: '09:50', subject: 'Software Project Management', teachers: ['Dr. Aliyev'], rooms: ['306'] },
  { day_index: 3, period: 3, start: '10:00', end: '10:50', subject: 'Mobile Apps (Native and web)', teachers: ['Prof. Nazarov'], rooms: ['Lab-2'] },
  { day_index: 4, period: 2, start: '09:00', end: '09:50', subject: 'Computer Science', teachers: ['Dr. Ergashev'], rooms: ['210'] },
  { day_index: 4, period: 3, start: '10:00', end: '10:50', subject: 'Computer Science', teachers: ['Dr. Ergashev'], rooms: ['210'] },
  { day_index: 4, period: 4, start: '11:00', end: '11:50', subject: 'Digitalization', teachers: ['Dr. Sattarov'], rooms: ['308'] },
  { day_index: 5, period: 1, start: '08:00', end: '08:50', subject: 'Software for Sustainable Development', teachers: ['Prof. Murodova'], rooms: ['401'] },
  { day_index: 5, period: 2, start: '09:00', end: '09:50', subject: 'Software for Sustainable Development', teachers: ['Prof. Murodova'], rooms: ['401'] },
  { day_index: 6, period: 3, start: '10:00', end: '10:50', subject: 'Theory of economics', teachers: ['Dr. Hamidov'], rooms: ['101'] },
];

export default {
  title: 'Komponentlar/TimetableView',
  component: TimetableView,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    timetable: { control: 'object', description: 'Dars jadvali ma\'lumotlari' },
  },
};

export const FullSchedule = {
  name: '📅 To\'liq jadval (SE-22)',
  args: {
    timetable: sampleTimetable,
  },
};

export const EmptySchedule = {
  name: '📭 Bo\'sh jadval',
  args: {
    timetable: [],
  },
};

export const SingleDay = {
  name: '📆 Bir kunlik jadval',
  args: {
    timetable: sampleTimetable.filter(t => t.day_index === 1),
  },
};

export const MondaySchedule = {
  name: '📆 Dushanba (to\'liq)',
  args: {
    timetable: sampleTimetable.filter(t => t.day_index === 1),
  },
};

export const CompactView = {
  name: '📏 Kichik ekranda (qisqa jadval)',
  args: {
    timetable: sampleTimetable.slice(0, 6),
  },
};
