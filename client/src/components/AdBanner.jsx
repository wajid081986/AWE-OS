export default function AdBanner({ position }) {
  // Replace this div with your actual AdSense unit once approved
  // <ins class="adsbygoogle" data-ad-client="ca-pub-XXXXXXX" data-ad-slot="XXXXXXX" .../>
  return (
    <div className={`ad-banner ${position}`}>
      <span>Ad · {position === 'top' ? '728×90' : '160×600'}</span>
    </div>
  );
}
