import React, { useEffect, useMemo, useRef, useState } from "react";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";


function extractYouTubeId(urlOrId) {
  const s = (urlOrId || "").trim();

  // If just entered the VIDEOID, do "https://youtu.be/VIDEOID."
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;

  try {
    const u = new URL(s);

    //Case 1: If it is the shortened link.
    // youtu.be/<VIDEOID>
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }

    //Case 2: Regular YouTube link 

    // youtube.com/watch?v=<id>
    if (u.searchParams.get("v")) {
      const id = u.searchParams.get("v");
      return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }
    
    //Case 3 Embed or YouTube shorts

    // youtube.com/embed/<id> or /shorts/<id>
    const parts = u.pathname.split("/").filter(Boolean);
    const idx = parts.findIndex((p) => p === "embed" || p === "shorts");
    if (idx !== -1 && parts[idx + 1]) {
      const id = parts[idx + 1];
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }

    return null;
  } catch {
    return null;
  }
}

function loadYouTubeAPI() {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) return resolve();

    if (!document.getElementById("yt-iframe-api")) {
      const tag = document.createElement("script");
      tag.id = "yt-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
    }

    window.onYouTubeIframeAPIReady = () => resolve();
  });
}

//Convert time to display format.

function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export default function App() {
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [loopOn, setLoopOn] = useState(true);

  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);

  const playerRef = useRef(null);
  const loopTimerRef = useRef(null);

  const loopOnRef = useRef(loopOn);
  const startTimeRef = useRef(startTime);
  const endTimeRef = useRef(endTime);

  useEffect(() => { loopOnRef.current = loopOn; }, [loopOn]);
  useEffect(() => { startTimeRef.current = startTime; }, [startTime]);
  useEffect(() => { endTimeRef.current = endTime; }, [endTime]);

  const videoId = useMemo(() => extractYouTubeId(submitted), [submitted]);

  const embedUrl = useMemo(() => {
    if (!videoId) return "";

    const params = new URLSearchParams();
    params.set("autoplay", "1");
    params.set("mute", "1");
    params.set("enablejsapi", "1");
    params.set("playsinline", "1");

    return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
  }, [videoId]);

  useEffect(() => {
    let cancelled = false;

    async function setupPlayer() {
      if (!videoId) return;

      await loadYouTubeAPI();
      if (cancelled) return;

      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch {}
        playerRef.current = null;
      }

      setDuration(0);
      setStartTime(0);
      setEndTime(0);

      playerRef.current = new window.YT.Player("yt-player", {
        events: {
          onReady: (e) => {
            try {
              e.target.mute();
              e.target.playVideo();
            } catch {}

            const poll = setInterval(() => {
              try {
                const d = e.target.getDuration();
                if (d && d > 0) {
                  clearInterval(poll);
                  setDuration(d);
                  setStartTime(0);
                  setEndTime(d);
                }
              } catch {}
            }, 200);

            setTimeout(() => clearInterval(poll), 5000);
          },
          onStateChange: (e) => {
            if (!loopOnRef.current) return;

            // Jump back to the start time of the segment loop.
            if (e.data === window.YT.PlayerState.ENDED) {
              try {
                e.target.seekTo(startTimeRef.current || 0, true);
                e.target.playVideo();
              } catch {}
            }
          }
        }
      });
    }

    setupPlayer();

    return () => {
      cancelled = true;
    };
  }, [videoId]);

  useEffect(() => {
    if (loopTimerRef.current) {
      clearInterval(loopTimerRef.current);
      loopTimerRef.current = null;
    }

    if (!playerRef.current) return;
    if (!videoId) return;
    if (!loopOn) return;
    if (!duration) return;

    loopTimerRef.current = setInterval(() => {
      try {
        const p = playerRef.current;

        const a = Math.max(0, Math.min(startTimeRef.current || 0, duration));
        const b = Math.max(0, Math.min(endTimeRef.current || duration, duration));

        const start = Math.min(a, b);
        const end = Math.max(a, b);

        if (!(end > start)) return;

        const t = p.getCurrentTime();

        if (t < start || t >= end - 0.15) {
          p.seekTo(start, true);
        }
      } catch {}
    }, 250);

    return () => {
      if (loopTimerRef.current) {
        clearInterval(loopTimerRef.current);
        loopTimerRef.current = null;
      }
    };
  }, [loopOn, startTime, endTime, duration, videoId]);



  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: 16, fontFamily: "system-ui" }}>
      <h2>YouTube Video Looper</h2>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(input);
        }}
        style={{ display: "flex", gap: 8, marginBottom: 16 }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter URL or Video ID "
          style={{ flex: 1, padding: 10, fontSize: 16 }}
        />
        <button type="submit" style={{ padding: "10px 14px", fontSize: 16 }}>
          Load
        </button>

        <button
          type="button"
          onClick={() => setLoopOn(v => !v)}
          disabled={!videoId && !submitted}
          style={{ padding: "10px 14px", fontSize: 16 }}
        >
          Loop: {loopOn ? "On" : "Off"}
        </button>

      </form>

      {!submitted ? (
        <p>Click <b>Load</b> to star .</p>
      ) : !videoId ? (
        <p style={{ color: "crimson" }}>
          Could not parse YouTube ID.
        </p>
      ) : (
        <div>
          <div style={{ position: "relative", paddingTop: "56.25%" /* 16:9 */ }}>
            <iframe
              id="yt-player"
              key={videoId}
              title="YouTube Player"
              src={embedUrl}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>

          <p style={{ marginTop: 10 }}>
            Loaded video id: <code>{videoId}</code>
          </p>

          {duration > 0 && (
            <div style={{ marginTop: 16, padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
              <p style={{ marginTop: 0 }}>
                Loop Segment: <b>{formatTime(startTime)}</b> to <b>{formatTime(endTime)}</b> (Total: {formatTime(duration)})
              </p>

              <Slider
                range
                min={0}
                max={Math.floor(duration)}
                step={1}
                allowCross={false}
                pushable={1}
                value={[startTime, endTime]}
                onChange={(vals) => {
                  const a = Number(vals[0]);
                  const b = Number(vals[1]);
                  setStartTime(a);
                  setEndTime(b);
                }}
              />



            </div>
          )}

        </div>
      )}
    </div>
  );
}
