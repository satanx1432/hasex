# MOBILE & DESKTOP LAYOUTS - TAILWIND CSS V4

## DESIGN SYSTEM (Tailwind CSS v4)

```css
@theme {
  /* Colors */
  --color-primary: #0A0A0A;
  --color-secondary: #FFFFFF;
  --color-accent: #FF6B35;
  --color-success: #4CAF50;
  --color-warning: #FFC107;
  
  /* Typography */
  --font-sans: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", monospace;
  
  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --spacing-2xl: 48px;
  
  /* Border Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-2xl: 24px;
}
```

## MOBILE LAYOUT (320-767px)

### Base Layout Structure

```tsx
// src/app/(app)/page.tsx
export default function CoachScreen() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <MobileHeader />
      <MobileContent />
      <MobileNavigation />
    </div>
  );
}
```

### Mobile Header

```tsx
function MobileHeader() {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-white/10">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-[#FF6B35] flex items-center justify-center">
          <span className="text-lg">🎯</span>
        </div>
        <span className="text-sm font-semibold">The Coach</span>
      </div>
      
      <div className="flex items-center gap-3">
        <button className="w-8 h-8 flex items-center justify-center rounded-full border border-white/20">
          <span className="text-sm">💡</span>
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4CAF50] to-[#2196F3]" />
      </div>
    </header>
  );
}
```

### Mobile Content (State-Dependent)

```tsx
function MobileContent({ user, state, challenge }) {
  return (
    <main className="flex-1 overflow-y-auto pb-20">
      {state === 'goal_setting' && <GoalSettingMobile />}
      {state === 'challenge_active' && <ChallengeCardMobile challenge={challenge} />}
      {state === 'challenge_in_progress' && <ChallengeProgressMobile challenge={challenge} />}
      {state === 'challenge_completed' && <CompletionViewMobile challenge={challenge} />}
      {state === 'adaptation' && <AdaptationViewMobile />}
    </main>
  );
}
```

### Mobile: Challenge Card

```tsx
function ChallengeCardMobile({ challenge }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] p-6">
      {/* User Greeting */}
      <div className="text-center mb-8">
        <p className="text-2xl font-bold mb-2">Hey, {user.name}</p>
        <p className="text-gray-400">Today's challenge</p>
      </div>
      
      {/* Challenge */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-8 w-full max-w-sm">
        <div className="text-6xl mb-4 text-center">⚡</div>
        <h2 className="text-xl font-bold text-center mb-4">
          {challenge.title}
        </h2>
        <p className="text-gray-400 text-center mb-6">
          {challenge.description}
        </p>
        
        {/* Challenge Details */}
        <div className="flex items-center justify-center gap-4 text-sm text-gray-400">
          <span className="flex items-center gap-1">
            <span>⏱️</span>
            {challenge.time_estimate_minutes}min
          </span>
          <span className="flex items-center gap-1">
            <span>📊</span>
            {challenge.difficulty}
          </span>
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex flex-col gap-3 w-full max-w-sm">
        <button className="bg-[#FF6B35] text-white font-semibold py-4 px-6 rounded-xl">
          I'M IN
        </button>
        <button className="bg-white/5 border border-white/10 text-white py-4 px-6 rounded-xl">
          NOT TODAY
        </button>
      </div>
    </div>
  );
}
```

### Mobile: Completion View

```tsx
function CompletionViewMobile({ challenge, evidence }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] p-6">
      {/* Celebration */}
      <div className="text-8xl mb-4 animate-pulse">🔥</div>
      <h2 className="text-2xl font-bold mb-6 text-center">You did it.</h2>
      
      {/* Evidence */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 w-full max-w-sm">
        <div className="text-gray-400 mb-2">Yesterday</div>
        <p className="text-lg mb-4">{evidence.previous_state}</p>
        
        <div className="text-[#4CAF50] mb-2">Today</div>
        <p className="text-lg mb-4">{evidence.new_state}</p>
        
        <div className="border-t border-white/10 pt-4">
          <p className="text-sm text-gray-400 mb-2">You're becoming:</p>
          {evidence.traits.map(trait => (
            <p key={trait} className="text-[#FF6B35]">• {trait}</p>
          ))}
        </div>
      </div>
      
      {/* Next Challenge */}
      <div className="w-full max-w-sm">
        <p className="text-center text-gray-400 mb-4">Tomorrow</p>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
          <p className="text-center">{challenge.next_challenge}</p>
        </div>
        
        <button className="w-full bg-white/10 border border-white/20 py-4 px-6 rounded-xl">
          See you then
        </button>
      </div>
    </div>
  );
}
```

### Mobile Navigation

```tsx
function MobileNavigation() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#0A0A0A] border-t border-white/10 px-4 py-3">
      <div className="flex items-center justify-around max-w-md mx-auto">
        <button className="flex flex-col items-center gap-1 text-[#FF6B35]">
          <span className="text-2xl">⚡</span>
          <span className="text-xs">Today</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-gray-400">
          <span className="text-2xl">💬</span>
          <span className="text-xs">Chat</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-gray-400">
          <span className="text-2xl">📊</span>
          <span className="text-xs">Progress</span>
        </button>
      </div>
    </nav>
  );
}
```

## DESKTOP LAYOUT (768px+)

### Desktop Base Structure

```tsx
// src/app/(app)/page.tsx
export default function CoachScreen() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex">
      <DesktopSidebar />
      <DesktopMain />
    </div>
  );
}
```

### Desktop Sidebar (Left)

```tsx
function DesktopSidebar() {
  return (
    <aside className="w-80 border-r border-white/10 flex flex-col">
      <SidebarHeader />
      <SidebarContent />
      <SidebarFooter />
    </aside>
  );
}

function SidebarHeader() {
  return (
    <div className="p-6 border-b border-white/10">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#FF6B35] flex items-center justify-center">
          <span className="text-xl">🎯</span>
        </div>
        <div>
          <h1 className="font-bold">The Coach</h1>
          <p className="text-xs text-gray-400">Daily challenges</p>
        </div>
      </div>
    </div>
  );
}

function SidebarContent() {
  return (
    <div className="flex-1 overflow-y-auto p-4">
      {/* User Progress */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Progress</span>
          <span className="text-sm font-bold text-[#4CAF50]">42%</span>
        </div>
        <div className="w-full h-2 bg-white/10 rounded-full mb-2">
          <div className="w-[42%] h-full bg-gradient-to-r from-[#4CAF50] to-[#2196F3] rounded-full" />
        </div>
        <p className="text-xs text-gray-400">42% to {user.goal}</p>
      </div>
      
      {/* Streak */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">🔥</span>
          <span className="font-bold">{user.current_streak} day streak</span>
        </div>
      </div>
      
      {/* Recent Challenges */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-3">Recent</h3>
        <div className="space-y-2">
          {recentChallenges.map(challenge => (
            <div key={challenge.id} className="flex items-center gap-2 p-2 rounded-lg">
              <span className={challenge.completed ? "text-[#4CAF50]" : "text-gray-400"}>
                {challenge.completed ? "✓" : "○"}
              </span>
              <span className="text-sm">{challenge.title}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### Desktop Main Content (Right)

```tsx
function DesktopMain() {
  return (
    <main className="flex-1 flex flex-col">
      <DesktopHeader />
      <DesktopContent />
    </main>
  );
}

function DesktopHeader() {
  return (
    <header className="border-b border-white/10 px-8 py-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400">Hey, {user.name}</p>
          <p className="text-2xl font-bold">Today's challenge</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4CAF50] to-[#2196F3]" />
          <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg">
            Ask Coach
          </button>
        </div>
      </div>
    </header>
  );
}

function DesktopContent() {
  return (
    <div className="flex-1 p-8">
      <div className="max-w-2xl mx-auto">
        {/* Challenge Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-8">
          <div className="flex items-start gap-6">
            <div className="text-6xl">⚡</div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2">{challenge.title}</h2>
              <p className="text-gray-400 mb-6">{challenge.description}</p>
              
              {/* Challenge Details */}
              <div className="flex items-center gap-6 text-sm text-gray-400 mb-6">
                <span className="flex items-center gap-2">
                  <span>⏱️</span>
                  {challenge.time_estimate_minutes}min
                </span>
                <span className="flex items-center gap-2">
                  <span>📊</span>
                  {challenge.difficulty}
                </span>
              </div>
              
              {/* Actions */}
              <div className="flex gap-4">
                <button className="bg-[#FF6B35] text-white font-semibold py-3 px-6 rounded-xl">
                  I'M IN
                </button>
                <button className="bg-white/5 border border-white/10 py-3 px-6 rounded-xl">
                  NOT TODAY
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Chat Context */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-sm font-semibold mb-4">Chat with Coach</h3>
          <ChatInterface />
        </div>
      </div>
    </div>
  );
}
```

## RESPONSIVE BEHAVIOR

### Tablet (768-1023px)

```css
/* Use two-column layout */
.main-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

/* Challenge card takes left, chat takes right */
```

### Desktop (1024px+)

```css
/* Three-column layout */
.main-content {
  display: grid;
  grid-template-columns: 300px 1fr 400px;
  gap: 2rem;
}

/* Sidebar - Challenge - Chat */
```

## ANIMATIONS

### Mobile

```css
/* Challenge appear */
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.challenge-card {
  animation: slideUp 0.3s ease-out;
}

/* Completion celebrate */
@keyframes celebrate {
  0% { transform: scale(0) rotate(-180deg); }
  50% { transform: scale(1.5) rotate(0deg); }
  100% { transform: scale(1) rotate(0deg); }
}

.completion-fire {
  animation: celebrate 0.5s ease-out;
}
```

### Desktop

```css
/* Subtle transitions */
.challenge-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.challenge-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(255, 107, 53, 0.1);
}
```

## ACCESSIBILITY

- Touch targets minimum 44x44px (mobile)
- Focus states visible (desktop)
- Screen reader announcements
- Color contrast minimum 4.5:1
- Keyboard navigation
- Reduced motion support

These layouts follow the ONE PAGE philosophy while adapting to different screen sizes.
