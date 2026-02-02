import { getEdupageTimetable } from '@/lib/edupage';
import { TimetableView } from '@/components/timetable-view';
import { Suspense } from 'react';
import { RefreshCcw, Calendar, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const revalidate = 3600; // Revalidate every hour
export const metadata = {
  title: 'Timetable | SE-22',
  description: 'Class schedule for SE-22',
};

export default async function TimetablePage() {
  let timetable = [];
  let error = null;
  let lastUpdated = new Date().toISOString();

  try {
    timetable = await getEdupageTimetable("SE-22");
  } catch (e) {
    console.error("Failed to load timetable", e);
    error = "Could not fetch the latest timetable. Please try again later.";
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header Section */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <Link href="/" className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors" title="Back to Home">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    <h1 className="text-xl font-bold">Timetable (SE-22)</h1>
                </div>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground hidden sm:flex">
                <span>Updated: {new Date(lastUpdated).toLocaleTimeString()}</span>
            </div>
        </div>
      </div>

      <main className="container mx-auto py-8 px-4">
        {error ? (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-destructive/10 rounded-xl border border-destructive/20">
                <p className="text-destructive font-semibold mb-2">{error}</p>
                <p className="text-sm text-muted-foreground">Check server logs for details.</p>
            </div>
        ) : (
            <Suspense fallback={
                <div className="flex items-center justify-center py-20">
                    <RefreshCcw className="w-8 h-8 animate-spin text-primary" />
                </div>
            }>
                <TimetableView timetable={timetable} />
            </Suspense>
        )}
      </main>
    </div>
  );
}
