export default function ClauseEditor({ register, errors }) {
  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Additional Custom Clauses <span className="text-gray-500 font-normal">(optional)</span>
        </label>
        <textarea
          {...register('additionalClauses')}
          rows={5}
          placeholder="Add any specific clauses you want included in the contract...&#10;e.g. — The Service Provider shall attend weekly check-in calls every Monday at 10 AM IST."
          className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 resize-none transition-colors"
        />
        {errors.additionalClauses && (
          <p className="text-xs text-red-400 mt-1">{errors.additionalClauses.message}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          These clauses will be appended as a final section to the contract.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Freelancer Signature Name
          </label>
          <input
            {...register('freelancerSignatureName')}
            type="text"
            placeholder="Name as it will appear on signature"
            className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Client Authorised Signatory
          </label>
          <input
            {...register('clientSignatureName')}
            type="text"
            placeholder="Client authorised signatory name"
            className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors"
          />
        </div>
      </div>
    </div>
  )
}
