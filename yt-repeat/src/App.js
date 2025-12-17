import React, { useMemo, useState } from "react";

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

export default function App() {
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [loopOn, setLoopOn] = useState(true);

  const videoId = useMemo(() => extractYouTubeId(submitted), [submitted]);
const embedUrl = useMemo(() => {
  if (!videoId) return "";

  const params = new URLSearchParams();
  params.set("autoplay", "1");
  params.set("mute", "1");

  if (loopOn) {
    params.set("loop", "1");
    params.set("playlist", videoId); // To make sure only one video is looped.
  }

  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}, [videoId, loopOn]);



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
        </div>
      )}
    </div>
  );
}
