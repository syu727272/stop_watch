import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const API_URL = 'http://localhost:3001/api';

function App() {
  const [time, setTime] = useState(0);
  const [laps, setLaps] = useState([]);
  const [isRunning, setIsRunning] = useState(false);

  // Local timer state for smooth display
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const baseTimeRef = useRef(0);

  const fetchTime = async () => {
    try {
      const res = await fetch(`${API_URL}/time`);
      const data = await res.json();
      // Sync local state with server periodically
      if (!isRunning) {
        setTime(data.elapsedTime);
        baseTimeRef.current = data.elapsedTime;
      }
    } catch (error) {
      console.error('Failed to fetch time', error);
    }
  };

  const fetchLaps = async () => {
    try {
      const res = await fetch(`${API_URL}/laps`);
      const data = await res.json();
      setLaps(data);
    } catch (error) {
      console.error('Failed to fetch laps', error);
    }
  };

  const handleStart = async () => {
    await fetch(`${API_URL}/start`, { method: 'POST' });
    setIsRunning(true);
    startTimeRef.current = Date.now();
  };

  const handleStop = async () => {
    await fetch(`${API_URL}/stop`, { method: 'POST' });
    setIsRunning(false);
    baseTimeRef.current = time;
  };

  const handleReset = async () => {
    await fetch(`${API_URL}/reset`, { method: 'POST' });
    setIsRunning(false);
    setTime(0);
    setLaps([]);
    baseTimeRef.current = 0;
    startTimeRef.current = null;
  };

  const handleLap = async () => {
    const res = await fetch(`${API_URL}/laps`, { method: 'POST' });
    if (res.ok) {
      await fetchLaps();
    }
  };

  const handleDeleteLap = async (id) => {
    const res = await fetch(`${API_URL}/laps/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setLaps((prev) => prev.filter((lap) => lap.id !== id));
    }
  };

  // Local display loop
  useEffect(() => {
    if (isRunning) {
      const update = () => {
        const now = Date.now();
        const elapsed = baseTimeRef.current + (now - startTimeRef.current);
        setTime(elapsed);
        timerRef.current = requestAnimationFrame(update);
      };
      timerRef.current = requestAnimationFrame(update);
    } else {
      cancelAnimationFrame(timerRef.current);
    }
    return () => cancelAnimationFrame(timerRef.current);
  }, [isRunning]);

  // Periodic sync and initial load
  useEffect(() => {
    fetchTime();
    fetchLaps();
    const syncInterval = setInterval(() => {
      if (!isRunning) fetchTime(); // Only sync when stopped to avoid jumps, or every 5s if running
    }, 5000);
    return () => clearInterval(syncInterval);
  }, [isRunning]);

  const formatTime = (time) => {
    const ms = `0${Math.floor((time % 1000) / 10)}`.slice(-2);
    const s = `0${Math.floor(time / 1000) % 60}`.slice(-2);
    const m = `0${Math.floor(time / 60000) % 60}`.slice(-2);
    return `${m}:${s}.${ms}`;
  };

  return (
    <div className="App">
      <div className="stopwatch">
        <div className="time">{formatTime(time)}</div>

        <div className="buttons">
          {!isRunning ? (
            <button className="btn-start" onClick={handleStart}>START</button>
          ) : (
            <button className="btn-stop" onClick={handleStop}>STOP</button>
          )}
          <button className="btn-lap" onClick={handleLap} disabled={time === 0}>LAP</button>
          <button className="btn-reset" onClick={handleReset}>RESET</button>
        </div>

        <div className="laps">
          <h2>Laps History</h2>
          <ul>
            {laps.map((lap, index) => (
              <li key={lap.id}>
                <div className="lap-info">
                  <span className="lap-label">LAP {laps.length - index}</span>
                  <div className="lap-time">{formatTime(lap.lap_time)}</div>
                </div>
                <button
                  className="delete-btn"
                  onClick={() => handleDeleteLap(lap.id)}
                  title="Delete lap"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;
