import React from 'react'

export default function AdminDashboard() {
  return (
    <div className="p-6 space-y-6 text-gray-100">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <span className="text-sm text-gray-400">AWE-OS Control Panel</span>
      </div>

      {/* Stats / Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 p-4 rounded-xl">
          <h3 className="text-sm text-gray-400">Total Tools</h3>
          <p className="text-xl font-semibold">—</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-xl">
          <h3 className="text-sm text-gray-400">Revenue</h3>
          <p className="text-xl font-semibold">—</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-xl">
          <h3 className="text-sm text-gray-400">Active Users</h3>
          <p className="text-xl font-semibold">—</p>
        </div>
      </div>

      {/* Tools Performance */}
      <div className="bg-gray-800 p-4 rounded-xl">
        <h2 className="font-semibold mb-2">Tools Performance</h2>
        <p className="text-sm text-gray-400">
          (Placeholder — connect real data later)
        </p>
      </div>

      {/* AI / Agents Section */}
      <div className="bg-gray-800 p-4 rounded-xl">
        <h2 className="font-semibold mb-2">AI Agents</h2>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• Idea Agent</li>
          <li>• Builder Agent</li>
          <li>• Deployment Agent</li>
          <li>• Revenue Agent</li>
          <li>• Marketing Agent</li>
        </ul>
      </div>

      {/* Activity Feed */}
      <div className="bg-gray-800 p-4 rounded-xl">
        <h2 className="font-semibold mb-2">Activity Feed</h2>
        <p className="text-sm text-gray-400">
          Recent system actions will appear here
        </p>
      </div>

    </div>
  )
}