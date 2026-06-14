export default function PageHeader({ title, subtitle, actions, icon: Icon }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
      <div className="flex items-center gap-4">
        {Icon && (
          <div className="w-10 h-10 rounded-2xl bg-gradient-brand flex items-center justify-center shadow-glow-sm flex-shrink-0">
            <Icon size={20} className="text-white" />
          </div>
        )}
        <div>
          <h1 className="section-title">{title}</h1>
          {subtitle && <p className="section-subtitle mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-3 flex-shrink-0">{actions}</div>}
    </div>
  )
}
