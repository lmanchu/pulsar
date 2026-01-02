export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <nav className="flex justify-between items-center mb-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-500 rounded-full animate-pulse" />
            <span className="text-2xl font-bold text-white">Pulsar</span>
          </div>
          <div className="flex gap-4">
            <a href="/login" className="text-gray-300 hover:text-white transition">
              Login
            </a>
            <a
              href="/signup"
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-500 transition"
            >
              Get Started
            </a>
          </div>
        </nav>

        {/* Hero */}
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
            Your social presence,
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
              on autopilot
            </span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            AI-powered automation for Twitter, LinkedIn, and Threads. Generate engaging content,
            reply to your network, and grow your personal brand while you sleep.
          </p>
          <div className="flex justify-center gap-4">
            <a
              href="/signup"
              className="bg-purple-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-purple-500 transition"
            >
              Start Free Trial
            </a>
            <a
              href="#features"
              className="border border-gray-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:border-purple-500 transition"
            >
              Learn More
            </a>
          </div>
        </div>

        {/* Features */}
        <div id="features" className="mt-32 grid md:grid-cols-3 gap-8">
          <div className="bg-gray-800/50 p-8 rounded-2xl border border-gray-700">
            <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">🤖</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              AI Content Generation
            </h3>
            <p className="text-gray-400">
              Generate posts that match your voice and expertise. No more staring at
              a blank screen.
            </p>
          </div>

          <div className="bg-gray-800/50 p-8 rounded-2xl border border-gray-700">
            <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">💬</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Smart Replies
            </h3>
            <p className="text-gray-400">
              Automatically engage with your network. Track key accounts and reply
              with valuable insights.
            </p>
          </div>

          <div className="bg-gray-800/50 p-8 rounded-2xl border border-gray-700">
            <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">📅</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Auto Scheduling
            </h3>
            <p className="text-gray-400">
              Set your posting schedule and let Pulsar handle the rest. Optimal
              times for maximum engagement.
            </p>
          </div>
        </div>

        {/* Pricing Preview */}
        <div className="mt-32 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Simple Pricing</h2>
          <p className="text-gray-400 mb-8">Start growing your presence today</p>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="bg-gray-800/50 p-8 rounded-2xl border border-gray-700">
              <h3 className="text-lg font-semibold text-gray-400 mb-2">Starter</h3>
              <div className="text-4xl font-bold text-white mb-4">$29<span className="text-lg text-gray-400">/mo</span></div>
              <ul className="text-gray-400 text-sm space-y-2">
                <li>1 Platform</li>
                <li>3 posts/day</li>
                <li>5 replies/day</li>
              </ul>
            </div>

            <div className="bg-purple-900/50 p-8 rounded-2xl border border-purple-500 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-500 text-white text-xs px-3 py-1 rounded-full">
                Popular
              </div>
              <h3 className="text-lg font-semibold text-purple-300 mb-2">Pro</h3>
              <div className="text-4xl font-bold text-white mb-4">$79<span className="text-lg text-gray-400">/mo</span></div>
              <ul className="text-gray-300 text-sm space-y-2">
                <li>2 Platforms</li>
                <li>10 posts/day</li>
                <li>20 replies/day</li>
                <li>Tracked Accounts</li>
              </ul>
            </div>

            <div className="bg-gray-800/50 p-8 rounded-2xl border border-gray-700">
              <h3 className="text-lg font-semibold text-gray-400 mb-2">Agency</h3>
              <div className="text-4xl font-bold text-white mb-4">$199<span className="text-lg text-gray-400">/mo</span></div>
              <ul className="text-gray-400 text-sm space-y-2">
                <li>5 Accounts</li>
                <li>White Label</li>
                <li>API Access</li>
                <li>Priority Support</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-32 text-center text-gray-500 text-sm">
          <p>Pulsar - Your social presence, on autopilot</p>
          <p className="mt-2">Built by IrisGo</p>
        </footer>
      </div>
    </div>
  );
}
