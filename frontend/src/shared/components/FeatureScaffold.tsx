type FeatureScaffoldProps = {
  title: string;
  description: string;
  items: string[];
};

export function FeatureScaffold({ title, description, items }: FeatureScaffoldProps) {
  return (
    <div>
      <p className="section-kicker">Feature Scaffold</p>
      <h2>{title}</h2>
      <p className="description">{description}</p>
      <ul className="feature-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
