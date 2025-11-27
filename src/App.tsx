import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Landing } from './components/Landing';
import { Survey } from './components/Survey';
import { Success } from './components/Success';
import { Admin } from './components/Admin';
import { DeviceType } from './types';
import { generateFingerprint } from './utils/data';

function AppContent() {
  const [deviceType, setDeviceType] = useState<DeviceType>(DeviceType.UNSELECTED);
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    // Check local storage
    const votedLocal = localStorage.getItem('hasVoted');
    if (votedLocal === 'true') {
      setHasVoted(true);
    }
    
    // Log for debug
    const fp = generateFingerprint();
    console.log("Device Fingerprint:", fp);
  }, []);

  return (
    <Routes>
       <Route path="/admin" element={<Admin />} />
       
       {hasVoted ? (
           <Route path="*" element={<Success />} />
       ) : (
           <Route path="/" element={
            deviceType === DeviceType.UNSELECTED ? (
              <Landing onSelectDevice={setDeviceType} />
            ) : (
              <Survey 
                deviceType={deviceType} 
                onComplete={() => setHasVoted(true)} 
              />
            )
          } />
       )}
    </Routes>
  );
}

function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}

export default App;