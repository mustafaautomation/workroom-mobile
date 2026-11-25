import Svg, { Circle, Line, Rect, Text as SvgText } from 'react-native-svg';

export function DeliverablePreview({ previewKey, brandColor }: { previewKey: string; brandColor: string }) {
  if (previewKey === 'lookbook-pdf' || previewKey === 'script') {
    return <DocumentPreview previewKey={previewKey} brandColor={brandColor} />;
  }
  if (previewKey === 'storyboard') {
    return <StoryboardPreview />;
  }
  if (previewKey === 'homepage-hero') {
    return <HeroPreview brandColor={brandColor} />;
  }
  if (previewKey === 'fieldguide') {
    return <GuidePreview />;
  }
  return <CoverPreview brandColor={brandColor} />;
}

function CoverPreview({ brandColor }: { brandColor: string }) {
  return (
    <Svg viewBox="0 0 320 400" width="100%" height="100%" accessibilityRole="image">
      <Rect width="320" height="400" fill={brandColor} />
      <Rect x="36" y="48" width="248" height="250" fill="#F4EFE6" />
      <Rect x="58" y="78" width="90" height="190" fill="#1C1712" />
      <Rect x="160" y="110" width="96" height="158" fill="#C4B49A" />
      <SvgText x="36" y="340" fill="#F7F1E8" fontSize="22" fontFamily="Georgia">
        HARBOR
      </SvgText>
      <SvgText x="36" y="366" fill="#E7D3C4" fontSize="14">
        SPRING LOOK
      </SvgText>
    </Svg>
  );
}

function HeroPreview({ brandColor }: { brandColor: string }) {
  return (
    <Svg viewBox="0 0 320 220" width="100%" height="100%" accessibilityRole="image">
      <Rect width="320" height="220" fill="#F7F1E8" />
      <Rect x="0" y="0" width="150" height="220" fill={brandColor} />
      <Rect x="172" y="46" width="120" height="12" fill="#1C1712" />
      <Rect x="172" y="70" width="90" height="8" fill="#8C7D6E" />
      <Rect x="172" y="96" width="110" height="64" fill="#E7DFD2" />
      <SvgText x="172" y="186" fill="#1C1712" fontSize="16" fontFamily="Georgia">
        The coat, first.
      </SvgText>
    </Svg>
  );
}

function DocumentPreview({ previewKey, brandColor }: { previewKey: string; brandColor: string }) {
  const title = previewKey === 'script' ? 'NARRATION' : 'LOOKBOOK';
  return (
    <Svg viewBox="0 0 320 400" width="100%" height="100%" accessibilityRole="image">
      <Rect width="320" height="400" fill="#E7DFD2" />
      <Rect x="28" y="24" width="264" height="352" fill="#FFFCF8" />
      <Rect x="48" y="48" width="64" height="8" fill={brandColor} />
      <SvgText x="48" y="92" fill="#1C1712" fontSize="18" fontFamily="Georgia">
        {title}
      </SvgText>
      {Array.from({ length: 8 }).map((_, index) => (
        <Rect
          key={index}
          x="48"
          y={120 + index * 24}
          width={index % 3 === 0 ? 180 : 210}
          height="8"
          fill={index === 4 ? brandColor : '#E0D5C6'}
        />
      ))}
    </Svg>
  );
}

function StoryboardPreview() {
  return (
    <Svg viewBox="0 0 320 220" width="100%" height="100%" accessibilityRole="image">
      <Rect width="320" height="220" fill="#F7F1E8" />
      {[0, 1, 2, 3].map((index) => (
        <Rect
          key={index}
          x={16 + (index % 4) * 76}
          y="28"
          width="68"
          height="110"
          fill={index === 3 ? '#3D4A8A' : '#1C1712'}
        />
      ))}
      <SvgText x="16" y="176" fill="#1C1712" fontSize="14" fontFamily="Georgia">
        Hold on the result.
      </SvgText>
      <Circle cx="292" cy="168" r="10" fill="#3D4A8A" />
    </Svg>
  );
}

function GuidePreview() {
  return (
    <Svg viewBox="0 0 320 400" width="100%" height="100%" accessibilityRole="image">
      <Rect width="320" height="400" fill="#3E5C3A" />
      <Line x1="40" y1="70" x2="280" y2="70" stroke="#F4EFE6" strokeWidth="1" />
      <SvgText x="40" y="190" fill="#F7F1E8" fontSize="36" fontFamily="Georgia">
        Lisbon
      </SvgText>
      <SvgText x="40" y="230" fill="#D5E3D4" fontSize="16">
        A walking guide
      </SvgText>
      <Rect x="40" y="270" width="46" height="8" fill="#E6C98A" />
    </Svg>
  );
}
