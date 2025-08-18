import VoiceRecorder from '@/components/VoiceRecorder';

const Index = () => {
  return (
    <div className="min-h-screen bg-background py-8 flex flex-col">
      <div className="flex-1">
        <VoiceRecorder />
      </div>
      <footer className="mt-8 text-center">
        <p className="text-xs text-muted-foreground">
          This page was developed by Francisco Lopes as part of the Technical Assessment for the RHEI selection process. It is intended exclusively for demonstration purposes.
        </p>
      </footer>
    </div>
  );
};

export default Index;
