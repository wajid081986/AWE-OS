export default function TaxForm({
  country, setCountry,
  income, setIncome,
  ageGroup, setAgeGroup,
  regime, setRegime,
  filingStatus, setFilingStatus,
  onCalculate, onReset,
}) {
  const currencySymbol = country === 'india' ? '₹' : '$'

  const handleCountrySwitch = (c) => {
    setCountry(c)
    setIncome('')
    onReset()
  }

  return (
    <div className="space-y-5">
      {/* Country toggle */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {[
            { key: 'india', label: '🇮🇳 India' },
            { key: 'us',    label: '🇺🇸 USA'   },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleCountrySwitch(key)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                country === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Annual income */}
      <div>
        <label htmlFor="tax-income" className="block text-sm font-medium text-gray-700 mb-1.5">
          Annual Income ({currencySymbol})
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
            {currencySymbol}
          </span>
          <input
            id="tax-income"
            type="number"
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            placeholder={country === 'india' ? '1000000' : '75000'}
            min="0"
            className="w-full pl-7 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {country === 'india' && income && (
          <p className="text-xs text-gray-400 mt-1">
            {Number(income) >= 100000
              ? `= ₹${(Number(income) / 100000).toFixed(Number(income) % 100000 === 0 ? 0 : 2)} Lakh`
              : ''}
          </p>
        )}
      </div>

      {/* India-specific options */}
      {country === 'india' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tax Regime</label>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              {[
                { key: 'new', label: 'New Regime' },
                { key: 'old', label: 'Old Regime' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setRegime(key)}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                    regime === key
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Age Group</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'below60', label: 'Below 60' },
                { key: 'senior',  label: 'Senior (60–80)' },
                { key: 'super',   label: 'Super Sr (80+)' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setAgeGroup(key)}
                  className={`py-2 text-xs font-medium rounded-lg border transition-colors ${
                    ageGroup === key
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* US-specific options */}
      {country === 'us' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Filing Status</label>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {[
              { key: 'single',  label: 'Single' },
              { key: 'married', label: 'Married Filing Jointly' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilingStatus(key)}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  filingStatus === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          onClick={onCalculate}
          disabled={!income || Number(income) <= 0}
          className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-colors"
        >
          Calculate Tax
        </button>
        <button
          onClick={onReset}
          className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-sm font-medium transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Info note */}
      {country === 'india' && (
        <p className="text-xs text-gray-400 leading-relaxed">
          Includes ₹50,000 standard deduction. Old regime applies basic exemption by age group.
          Surcharge and 4% cess are applied as per IT rules.
        </p>
      )}
      {country === 'us' && (
        <p className="text-xs text-gray-400 leading-relaxed">
          Federal income tax only. Standard deduction: ${filingStatus === 'married' ? '29,200' : '14,600'} (2024).
          State taxes and FICA not included.
        </p>
      )}
    </div>
  )
}
