import Navbar from "../components/Navbar";
import PomodoroTimer from "../components/PomodoroTimer";
import TaskSection from "../components/TaskSection";

function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      {/* Functional Pomodoro timer */}
<PomodoroTimer />
{/* Interactive task manager */}
<div className="mt-8">
  <TaskSection />
</div>
      

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">

        {/* Welcome section */}
        <section className="mb-8">
          <p className="text-sm font-medium text-violet-600">
            YOUR SPACE TO FOCUS
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Make today count.
          </h1>

          <p className="mt-2 text-slate-500">
            One task at a time. You've got this.
          </p>
        </section>

        {/* Main dashboard cards */}
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2">

         

          {/* Task summary — real counts come later */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              YOUR PROGRESS
            </p>

            <h2 className="mt-3 text-4xl font-bold text-slate-900">
              0 tasks
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              A fresh start. Let's plan your day.
            </p>

            <div className="mt-6 flex gap-3">
              <div className="flex-1 rounded-xl bg-violet-50 p-4">
                <p className="text-2xl font-bold text-violet-700">0</p>
                <p className="text-sm text-slate-500">Pending</p>
              </div>

              <div className="flex-1 rounded-xl bg-emerald-50 p-4">
                <p className="text-2xl font-bold text-emerald-700">0</p>
                <p className="text-sm text-slate-500">Completed</p>
              </div>
            </div>
          </div>
        </section>

       

      </main>
    </div>
  );
}

export default HomePage;