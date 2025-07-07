import { Mic, Play, UploadCloud, Image as ImageIcon } from "lucide-react";
import { useState, useRef } from "react";

// TOGGLE THIS TO 'orb' or 'avatar'
const DOCTOR_STYLE = "avatar"; // or "orb"

const PROFESSIONAL_FONT = "'Inter', 'Segoe UI', 'Nunito', Arial, sans-serif";

const Card = ({ children, className }) => (
  <div className={`bg-green-50/80 rounded-3xl shadow-xl border border-green-200 ${className}`} style={{ fontFamily: PROFESSIONAL_FONT }}>
    {children}
  </div>
);

const Button = ({ children, onClick, className }) => (
  <button
    onClick={onClick}
    className={`bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-8 px-16 text-4xl rounded-full transition shadow-2xl focus:outline-none focus:ring-4 focus:ring-emerald-400 ${className}`}
    style={{ fontFamily: PROFESSIONAL_FONT, letterSpacing: "0.02em" }}
  >
    {children}
  </button>
);

function AnimatedOrb({ active, label }) {
  return (
    <div className="flex flex-col items-center mb-4">
      <div
        className={`rounded-full bg-gradient-to-tr from-emerald-400 to-green-300 shadow-lg transition-all duration-300 ${
          active ? "animate-pulse scale-105" : "opacity-80"
        }`}
        style={{
          width: 70,
          height: 70,
          boxShadow: "0 0 0 7px rgba(16, 185, 129, 0.08)",
          border: "3px solid #fff",
        }}
      />
      <span className="text-base text-emerald-900 mt-1 font-medium" style={{ fontFamily: PROFESSIONAL_FONT }}>{active ? label : ""}</span>
    </div>
  );
}

function DoctorAvatar({ active }) {
  return (
    <div className="flex flex-col items-center mb-4">
      <img
        src="https://img.freepik.com/free-vector/doctor-character-background_1270-84.jpg?w=300"
        alt="Doctor avatar"
        className={`w-20 h-20 rounded-full border-2 border-white shadow-lg bg-white object-cover transition-all duration-300 ${active ? "ring-2 ring-green-300 scale-105" : ""}`}
        style={{}}
      />
      <span className="text-base text-emerald-900 mt-1 font-medium" style={{ fontFamily: PROFESSIONAL_FONT }}>
        {active ? "Listening..." : ""}
      </span>
    </div>
  );
}

const SUGGESTIONS = [
  "What should I do next?",
  "Should I see a doctor in person?",
  "Is this contagious?",
  "How can I relieve symptoms at home?",
  "Can you show me what this usually looks like?",
];

export default function DoctorAppDemo() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [responseReady, setResponseReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([
    {
      role: "system",
      content:
        "You are a helpful, empathetic virtual doctor. Do not reference images. Keep your answers friendly, clear, and supportive. Always ask a follow-up question to better understand the user's symptoms.",
    },
  ]);

  const recognitionRef = useRef(null);

  const fetchChatGPTResponse = async (prompt) => {
    const updatedHistory = [...conversationHistory, { role: "user", content: prompt }];
    const recentHistory = updatedHistory.slice(-12);
    setConversationHistory(recentHistory);
    setLoading(true);

    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: recentHistory,
        }),
      });

      const data = await res.json();
      const aiMessage = data.choices?.[0]?.message?.content || "Sorry, I couldn't understand that.";
      setResponse(aiMessage);
      setResponseReady(true);
      setConversationHistory((prev) => [...prev, { role: "assistant", content: aiMessage }]);
      speakResponse(aiMessage);

    } catch (error) {
      console.error("Error fetching AI response:", error);
      setResponse("There was a problem contacting the doctor AI.");
      setResponseReady(true);
    } finally {
      setLoading(false);
    }
  };

  const speakResponse = async (text) => {
    try {
      const res = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "tts-1-hd",
          voice: "shimmer",
          input: text,
        }),
      });

      const arrayBuffer = await res.arrayBuffer();
      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();
    } catch (err) {
      console.error("TTS API error:", err);
    }
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Speech recognition not supported in this browser.");
      return;
    }

    const recognition = new window.webkitSpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-GB";

    recognition.onstart = () => {
      setListening(true);
      setTranscript("");
      setResponseReady(false);
      setResponse("");
    };

    recognition.onresult = (event) => {
      const speechResult = event.results[0][0].transcript;
      setTranscript(speechResult);
      setListening(false);
      fetchChatGPTResponse(speechResult);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setListening(false);
    };

    recognition.start();
  };

  const replayResponse = () => {
    if (response) {
      speakResponse(response);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setTranscript(suggestion);
    fetchChatGPTResponse(suggestion);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedImage(URL.createObjectURL(file));
    }
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-green-100 via-green-50 to-emerald-100 p-4 sm:p-6 flex flex-col justify-between"
      style={{ fontFamily: PROFESSIONAL_FONT, backgroundAttachment: "fixed" }}
    >
      <main className="max-w-2xl mx-auto w-full flex flex-col justify-between flex-1">
        {/* Header */}
        <div className="flex flex-col items-center mb-2 mt-2">
          <h1 className="text-4xl md:text-5xl font-extrabold text-center text-emerald-800 drop-shadow mb-2">
            Ask the Doctor
          </h1>
          <p className="text-lg text-center text-emerald-700 mb-2 font-medium">
            Your friendly AI medical advice, 24/7
          </p>
        </div>

        {/* Doctor: avatar or orb */}
        <div className="flex justify-center mb-2">
          {DOCTOR_STYLE === "orb" ? (
            <AnimatedOrb active={listening || loading} label={listening ? "Listening..." : loading ? "Doctor is thinking..." : ""} />
          ) : (
            <DoctorAvatar active={listening || loading} />
          )}
        </div>

        {/* Speak button */}
        <div className="text-center my-7">
          <Button onClick={handleVoiceInput} className="text-4xl py-8 px-20">
            <Mic className="inline-block mr-3 w-10 h-10" /> Speak
          </Button>
        </div>

        {transcript && <p className="text-emerald-900 text-center mb-2 italic">{`You said: "${transcript}"`}</p>}

        {/* Doctor chat bubble */}
        {responseReady && (
          <div className="flex justify-start mt-2">
            <Card className="p-8 max-w-xl w-full rounded-[2.2rem] shadow-2xl bg-white/95 border-2 border-emerald-200">
              <div className="flex flex-col items-start">
                <span className="text-emerald-600 font-bold mb-2 text-lg">Doctor:</span>
                <p className="text-gray-900 whitespace-pre-line text-lg" style={{ fontFamily: PROFESSIONAL_FONT }}>
                  {response}
                </p>
                <div className="flex items-center mt-3 w-full">
                  <Button onClick={replayResponse} className="bg-emerald-500 hover:bg-emerald-600 text-base py-2 px-6 text-xl shadow">
                    <Play className="inline-block mr-2" /> Replay
                  </Button>
                  <div className="ml-auto flex gap-2 flex-wrap">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        className="bg-green-100 hover:bg-green-200 text-emerald-900 rounded-full px-4 py-2 text-xs transition border border-emerald-200"
                        onClick={() => handleSuggestionClick(s)}
                        style={{ fontFamily: PROFESSIONAL_FONT }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Upload */}
        <div className="mt-8 text-center">
          <label htmlFor="imageUpload" className="cursor-pointer inline-block text-sm text-emerald-700 hover:underline" style={{ fontFamily: PROFESSIONAL_FONT }}>
            <UploadCloud className="inline-block mr-2" /> Upload an image of your symptom
          </label>
          <input id="imageUpload" type="file" onChange={handleImageUpload} className="hidden" />
        </div>
        {uploadedImage && (
          <div className="mt-4 text-center">
            <ImageIcon className="inline-block mr-2" />
            <img src={uploadedImage} alt="Uploaded" className="max-w-xs mx-auto rounded-lg shadow" />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center mt-10 text-gray-600 text-sm opacity-80" style={{ fontFamily: PROFESSIONAL_FONT }}>
        <div className="mb-2">
          <span>Private, secure &mdash; No personal data stored</span>
        </div>
        <div>
          Built with <span className="text-emerald-700 font-semibold">OpenAI</span> • For demonstration only, not a substitute for medical advice.
        </div>
      </footer>
    </div>
  );
}
