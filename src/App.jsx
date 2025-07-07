import { Mic, Play, UploadCloud, Image as ImageIcon } from "lucide-react";
import { useState, useRef } from "react";

const Card = ({ children, className }) => (
  <div className={`bg-white/80 backdrop-blur-md rounded-xl shadow-lg border border-gray-200 ${className}`}>{children}</div>
);
const CardContent = ({ children, className }) => (
  <div className={className}>{children}</div>
);
const Button = ({ children, onClick, className }) => (
  <button
    onClick={onClick}
    className={`bg-teal-600 hover:bg-teal-700 text-white font-semibold py-4 px-8 text-xl rounded-full transition shadow-md ${className}`}
  >
    {children}
  </button>
);

function AnimatedOrb({ active, label }) {
  return (
    <div className="flex flex-col items-center mb-4">
      <div
        className={`rounded-full bg-gradient-to-tr from-teal-400 to-blue-400 shadow-lg transition-all duration-300
          ${active ? "animate-pulse scale-110" : "opacity-60"}`}
        style={{ width: 70, height: 70 }}
      />
      <span className="text-sm text-teal-700 mt-2">{active ? label : ""}</span>
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

    const recognition = new webkitSpeechRecognition();
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-100 to-blue-200 p-4 sm:p-6 relative overflow-hidden">
      <div className="max-w-2xl mx-auto">

        {/* Doctor avatar */}
        <div className="flex justify-center mb-4">
          <img
            src="https://img.freepik.com/free-vector/doctor-character-background_1270-84.jpg?w=200"
            alt="Doctor avatar"
            className="w-28 h-28 rounded-full border-4 border-white shadow-lg bg-white object-cover"
          />
        </div>
        {/* Animated orb */}
        <AnimatedOrb active={listening || loading} label={listening ? "Listening..." : loading ? "Doctor is thinking..." : ""} />

        {/* Headline and tagline */}
        <h1 className="text-5xl font-bold mb-2 text-center text-teal-800 drop-shadow">Talk to the Doctor Now!</h1>
        <p className="text-lg text-center text-teal-700 mb-6 font-medium">Your private, friendly AI medical consultation starts here.</p>

        <div className="text-center my-6">
          <Button onClick={handleVoiceInput} className="text-3xl py-6 px-12">
            <Mic className="inline-block mr-2 w-6 h-6" /> Speak
          </Button>
        </div>

        {transcript && <p className="text-gray-800 text-center mb-2 italic">You said: "{transcript}"</p>}

        {responseReady && (
          <Card className="p-6 my-6">
            <CardContent>
              <p className="text-gray-800 whitespace-pre-line">{response}</p>
            </CardContent>
            <div className="text-right mt-4">
              <Button onClick={replayResponse} className="bg-indigo-500 hover:bg-indigo-600">
                <Play className="inline-block mr-2" /> Replay
              </Button>
            </div>
            {/* Smart Suggestions */}
            <div className="mt-6 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  className="bg-teal-100 hover:bg-teal-200 text-teal-900 rounded-full px-4 py-2 text-sm transition border border-teal-200"
                  onClick={() => handleSuggestionClick(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </Card>
        )}

        <div className="mt-8 text-center">
          <label htmlFor="imageUpload" className="cursor-pointer inline-block text-sm text-teal-700 hover:underline">
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
      </div>
    </div>
  );
}
