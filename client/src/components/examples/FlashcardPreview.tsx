import FlashcardPreview from '../FlashcardPreview';

export default function FlashcardPreviewExample() {
  return (
    <div className="p-8">
      <FlashcardPreview
        question="What is the powerhouse of the cell?"
        answer="Mitochondria"
        cardType="qa"
      />
    </div>
  );
}
