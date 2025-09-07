import { GoogleGenAI } from "@google/genai";

declare const JSZip: any;

const App = () => {
  // Common elements
  const promptInput = document.getElementById('prompt-input') as HTMLTextAreaElement;
  const generateBtn = document.getElementById('generate-btn') as HTMLButtonElement;
  const clearBtn = document.getElementById('clear-btn') as HTMLButtonElement;
  const suggestPromptBtn = document.getElementById('suggest-prompt-btn') as HTMLButtonElement;
  const resultContainer = document.getElementById('result-container');
  const resultContent = document.getElementById('result-content');
  const mediaContainer = document.getElementById('media-container');
  const downloadAllBtn = document.getElementById('download-all-btn') as HTMLButtonElement;
  const errorMessage = document.getElementById('error-message');
  const loadingContainer = document.getElementById('loading-container');
  const loadingSpinner = document.getElementById('loading-spinner');
  const loadingMessage = document.getElementById('loading-message');

  // Mode switching
  const modeIconBtn = document.getElementById('mode-icon') as HTMLButtonElement;
  const modeVideoBtn = document.getElementById('mode-video') as HTMLButtonElement;
  const modeAudioBtn = document.getElementById('mode-audio') as HTMLButtonElement;
  const iconOptionsContainer = document.getElementById('icon-options-container');
  const videoOptionsContainer = document.getElementById('video-options-container');
  const audioOptionsContainer = document.getElementById('audio-options-container');
  
  // Icon specific elements
  const negativePromptInput = document.getElementById('negative-prompt-input') as HTMLTextAreaElement;
  const undoBtn = document.getElementById('undo-btn') as HTMLButtonElement;
  const redoBtn = document.getElementById('redo-btn') as HTMLButtonElement;
  const aspectRatioSelect = document.getElementById('aspect-ratio-select') as HTMLSelectElement;
  const backgroundColorPicker = document.getElementById('background-color-picker') as HTMLInputElement;
  const transparencyToggle = document.getElementById('transparency-toggle') as HTMLInputElement;
  const promptHistoryDatalist = document.getElementById('prompt-history') as HTMLDataListElement;

  // Video specific elements
  const ffmpegToggle = document.getElementById('ffmpeg-toggle') as HTMLInputElement;
  const ffmpegCommandsInput = document.getElementById('ffmpeg-commands-input') as HTMLTextAreaElement;
  const textOverlayToggle = document.getElementById('text-overlay-toggle') as HTMLInputElement;
  const textOverlayInput = document.getElementById('text-overlay-input') as HTMLInputElement;
  const textOverlayPositionRadios = document.querySelectorAll('input[name="text-overlay-position"]');
  const videoChromaKeyToggle = document.getElementById('chroma-key-toggle') as HTMLInputElement;
  const videoChromaKeyColorPicker = document.getElementById('chroma-key-color-picker') as HTMLInputElement;
  
  // Audio specific elements
  const audioDurationInput = document.getElementById('audio-duration-seconds') as HTMLInputElement;

  // Preset elements
  const presetsSelect = document.getElementById('presets-select') as HTMLSelectElement;
  const presetNameInput = document.getElementById('preset-name-input') as HTMLInputElement;
  const savePresetBtn = document.getElementById('save-preset-btn') as HTMLButtonElement;
  const deletePresetBtn = document.getElementById('delete-preset-btn') as HTMLButtonElement;
  
  type AppMode = 'icon' | 'video' | 'audio';
  type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
  type ImageFormat = 'image/jpeg' | 'image/png';
  const PRESETS_STORAGE_KEY = 'ai_icon_generator_presets';
  const SESSION_STORAGE_KEY = 'ai_media_generator_last_session';
  const PROMPT_HISTORY_STORAGE_KEY = 'ai_icon_generator_prompt_history';
  const MAX_PROMPT_HISTORY_SIZE = 50;
  const DEFAULT_BACKGROUND_COLOR = '#f1f3ed';

  const PROMPT_SUGGESTIONS = {
    icon: [
        "A stylized phoenix rising from digital ashes, logo for a data recovery app.",
        "A minimalist icon of an origami hummingbird in flight, representing speed and precision.",
        "A friendly robot mascot holding a magnifying glass, for a search or analytics app.",
        "A shield icon made of interlocking puzzle pieces, symbolizing collaborative security.",
        "A sapling growing out of an open book, representing a learning or education app.",
    ],
    video: [
        "A time-lapse of a city skyline from day to night, with clouds moving and lights turning on.",
        "An aerial drone shot flying over a lush, green mountain range covered in mist.",
        "A close-up, slow-motion shot of a honey bee landing on a vibrant flower.",
        "A futuristic car driving down a neon-lit city street at night.",
        "A cat playfully chasing a red laser dot across a wooden floor.",
    ],
    audio: [
        "A calm, reassuring voice reading a short meditation script.",
        "An energetic and upbeat voice for a podcast intro.",
        "A clear, professional voice for a corporate training video."
    ]
  };

  interface AppState {
    prompt: string;
    negativePrompt: string;
    imageUrls: string[];
    format: ImageFormat;
    aspectRatio: AspectRatio;
    iconStyle: string;
    quality: string;
    backgroundColor: string;
    transparentBackground: boolean;
    numberOfIcons: number;
    generationId: number;
  }
  
  interface Preset {
      name: string;
      mode: AppMode;
      prompt: string;
      // Icon settings
      negativePrompt?: string;
      format?: ImageFormat;
      aspectRatio?: AspectRatio;
      iconStyle?: string;
      quality?: string;
      backgroundColor?: string;
      transparentBackground?: boolean;
      numberOfIcons?: number;
      // Video settings
      videoQuality?: string;
      videoStyle?: string;
      videoAudioTrack?: string;
      videoAspectRatio?: string;
      videoResolution?: string;
      videoDuration?: string;
      videoFfmpegEnabled?: boolean;
      videoFfmpegCommands?: string;
      videoTextOverlayEnabled?: boolean;
      videoTextOverlayText?: string;
      videoTextOverlayPosition?: string;
      videoChromaKeyEnabled?: boolean;
      videoChromaKeyColor?: string;
      // Audio settings
      audioVoice?: string;
      audioAccent?: string;
      audioTone?: string;
      audioDurationSeconds?: number;
      audioReverb?: string;
      audioEcho?: string;
      audioPitch?: string;
  }

  interface SessionState {
    prompt: string;
    negativePrompt?: string;
    format?: ImageFormat;
    aspectRatio?: AspectRatio;
    iconStyle?: string;
    quality?: string;
    backgroundColor?: string;
    transparentBackground?: boolean;
    numberOfIcons?: number;
    currentMode: AppMode;
    videoQuality?: string;
    videoStyle?: string;
    videoAudioTrack?: string;
    videoAspectRatio?: string;
    videoResolution?: string;
    videoDuration?: string;
    videoFfmpegEnabled?: boolean;
    videoFfmpegCommands?: string;
    videoTextOverlayEnabled?: boolean;
    videoTextOverlayText?: string;
    videoTextOverlayPosition?: string;
    videoChromaKeyEnabled?: boolean;
    videoChromaKeyColor?: string;
    audioVoice?: string;
    audioAccent?: string;
    audioTone?: string;
    audioDuration?: string; // For backward compatibility
    audioDurationSeconds?: number;
    audioReverb?: string;
    audioEcho?: string;
    audioPitch?: string;
  }

  let currentMode: AppMode = 'icon';
  let currentState: AppState | null = null;
  let undoStack: AppState[] = [];
  let redoStack: AppState[] = [];

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

  const getSelectedFormat = (): ImageFormat => {
    const selectedRadio = document.querySelector('input[name="format"]:checked') as HTMLInputElement;
    return (selectedRadio?.value as ImageFormat) || 'image/jpeg';
  }

  const getSelectedStyle = (): string => {
    const selectedRadio = document.querySelector('input[name="icon-style"]:checked') as HTMLInputElement;
    return selectedRadio?.value || '';
  }

  const getSelectedQuality = (): string => {
    const selectedRadio = document.querySelector('input[name="quality"]:checked') as HTMLInputElement;
    return selectedRadio?.value || 'standard';
  }
  
  const getSelectedVideoQuality = (): string => {
    const selectedRadio = document.querySelector('input[name="video-quality"]:checked') as HTMLInputElement;
    return selectedRadio?.value || 'standard';
  }

  const getSelectedVideoStyle = (): string => {
    const selectedRadio = document.querySelector('input[name="video-style"]:checked') as HTMLInputElement;
    return selectedRadio?.value || 'cinematic';
  }

  const getSelectedAudioTrack = (): string => {
    const selectedRadio = document.querySelector('input[name="video-audio-track"]:checked') as HTMLInputElement;
    return selectedRadio?.value || 'none';
  }

  const getSelectedVideoAspectRatio = (): string => {
    const selectedRadio = document.querySelector('input[name="video-aspect-ratio"]:checked') as HTMLInputElement;
    return selectedRadio?.value || '16:9';
  }
  
  const getSelectedVideoResolution = (): string => {
    const selectedRadio = document.querySelector('input[name="video-resolution"]:checked') as HTMLInputElement;
    return selectedRadio?.value || '720p';
  }

  const getSelectedVideoDuration = (): string => {
    const selectedRadio = document.querySelector('input[name="video-duration"]:checked') as HTMLInputElement;
    return selectedRadio?.value || 'medium';
  }

  const getSelectedAudioVoice = (): string => {
    const selectedRadio = document.querySelector('input[name="audio-voice"]:checked') as HTMLInputElement;
    return selectedRadio?.value || 'male';
  }

  const getSelectedAudioAccent = (): string => {
    const selectedRadio = document.querySelector('input[name="audio-accent"]:checked') as HTMLInputElement;
    return selectedRadio?.value || 'american';
  }
  
  const getSelectedAudioTone = (): string => {
    const selectedRadio = document.querySelector('input[name="audio-tone"]:checked') as HTMLInputElement;
    return selectedRadio?.value || 'professional';
  }

  const getAudioDurationSeconds = (): number => {
    const value = parseInt(audioDurationInput.value, 10);
    if (isNaN(value) || value < 1) return 1;
    if (value > 36000) return 36000;
    return value;
  };

  const getSelectedAudioReverb = (): string => {
    const selectedRadio = document.querySelector('input[name="audio-reverb"]:checked') as HTMLInputElement;
    return selectedRadio?.value || 'none';
  }
  const getSelectedAudioEcho = (): string => {
    const selectedRadio = document.querySelector('input[name="audio-echo"]:checked') as HTMLInputElement;
    return selectedRadio?.value || 'none';
  }
  const getSelectedAudioPitch = (): string => {
    const selectedRadio = document.querySelector('input[name="audio-pitch"]:checked') as HTMLInputElement;
    return selectedRadio?.value || 'normal';
  }

  const getSelectedNumberOfIcons = (): number => {
    const selectedRadio = document.querySelector('input[name="number-of-icons"]:checked') as HTMLInputElement;
    return selectedRadio ? parseInt(selectedRadio.value, 10) : 1;
  };

  const showError = (message: string) => {
    if (errorMessage) {
      errorMessage.textContent = message;
      errorMessage.classList.remove('hidden');
    }
    if (resultContent) {
      resultContent.classList.add('hidden');
    }
  };

  const updateButtonStates = () => {
    const hasPrompt = promptInput.value.trim().length > 0;
    generateBtn.disabled = !hasPrompt;
    undoBtn.disabled = undoStack.length === 0;
    redoBtn.disabled = redoStack.length === 0;
    
    const hasContent = hasPrompt || (resultContent && !resultContent.classList.contains('hidden'));
    clearBtn.disabled = !hasContent;

    const hasImages = currentState && currentState.imageUrls && currentState.imageUrls.length > 0;
    if (downloadAllBtn) {
        downloadAllBtn.disabled = !hasImages;
    }
  };
  
  const getPromptHistory = (): string[] => {
    try {
        const storedHistory = localStorage.getItem(PROMPT_HISTORY_STORAGE_KEY);
        return storedHistory ? JSON.parse(storedHistory) : [];
    } catch (e) {
        console.error("Failed to parse prompt history:", e);
        return [];
    }
  };

  const savePromptHistory = (history: string[]) => {
      try {
          localStorage.setItem(PROMPT_HISTORY_STORAGE_KEY, JSON.stringify(history));
      } catch (e) {
          console.error("Failed to save prompt history:", e);
      }
  };

  const addToPromptHistory = (prompt: string) => {
    if (!prompt) return;
    let history = getPromptHistory();
    history = history.filter(p => p.toLowerCase() !== prompt.toLowerCase());
    history.unshift(prompt);
    if (history.length > MAX_PROMPT_HISTORY_SIZE) {
        history = history.slice(0, MAX_PROMPT_HISTORY_SIZE);
    }
    savePromptHistory(history);
  };

  const populatePromptHistoryDatalist = () => {
    const history = getPromptHistory();
    if (promptHistoryDatalist) {
        promptHistoryDatalist.innerHTML = '';
        history.forEach(prompt => {
            const option = document.createElement('option');
            option.value = prompt;
            promptHistoryDatalist.appendChild(option);
        });
    }
  };

  const handleGeneration = () => {
    if (currentMode === 'icon') {
        generateImage();
    } else if (currentMode === 'video') {
        generateVideo();
    } else {
        generateAudio();
    }
  };

  // Helper to write string to DataView
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  const createPlaceholderWavBlob = (durationSeconds: number): Blob => {
      const RIFF = "RIFF", WAVE = "WAVE", fmt_ = "fmt ", data = "data";
      const sampleRate = 44100, numChannels = 1, bitsPerSample = 16;
      
      const subchunk1Size = 16;
      const blockAlign = numChannels * bitsPerSample / 8;
      const byteRate = sampleRate * blockAlign;
      const subchunk2Size = Math.floor(durationSeconds * sampleRate * blockAlign);
      const chunkSize = 36 + subchunk2Size;

      const buffer = new ArrayBuffer(44 + subchunk2Size);
      const view = new DataView(buffer);

      writeString(view, 0, RIFF);
      view.setUint32(4, chunkSize, true);
      writeString(view, 8, WAVE);
      writeString(view, 12, fmt_);
      view.setUint32(16, subchunk1Size, true);
      view.setUint16(20, 1, true); // AudioFormat = 1 (PCM)
      view.setUint16(22, numChannels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, byteRate, true);
      view.setUint16(32, blockAlign, true);
      view.setUint16(34, bitsPerSample, true);
      writeString(view, 36, data);
      view.setUint32(40, subchunk2Size, true);

      for (let i = 0; i < subchunk2Size / 2; i++) {
          const time = i / sampleRate;
          const amplitude = Math.sin(time * 2 * Math.PI * 440) * 32767;
          view.setInt16(44 + i * 2, amplitude, true);
      }

      return new Blob([view], { type: 'audio/wav' });
  };
  
  const audioBufferToWav = (buffer: AudioBuffer): Blob => {
    const numOfChan = buffer.numberOfChannels,
        len = buffer.length * numOfChan * 2 + 44,
        bufferArr = new ArrayBuffer(len),
        view = new DataView(bufferArr),
        channels = [],
        sampleRate = buffer.sampleRate;

    let offset = 0,
        pos = 0;

    const setUint16 = (data: number) => {
        view.setUint16(pos, data, true);
        pos += 2;
    }

    const setUint32 = (data: number) => {
        view.setUint32(pos, data, true);
        pos += 4;
    }

    writeString(view, pos, 'RIFF'); pos += 4;
    setUint32(len - 8);
    writeString(view, pos, 'WAVE'); pos += 4;

    writeString(view, pos, 'fmt '); pos += 4;
    setUint32(16);
    setUint16(1); // PCM
    setUint16(numOfChan);
    setUint32(sampleRate);
    setUint32(sampleRate * 2 * numOfChan); // byte rate
    setUint16(numOfChan * 2); // block align
    setUint16(16); // bits per sample

    writeString(view, pos, 'data'); pos += 4;
    setUint32(len - pos - 4);

    for (let i = 0; i < buffer.numberOfChannels; i++) {
        channels.push(buffer.getChannelData(i));
    }

    while (pos < len) {
        for (let i = 0; i < numOfChan; i++) {
            let sample = Math.max(-1, Math.min(1, channels[i][offset]));
            sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
            view.setInt16(pos, sample, true);
            pos += 2;
        }
        offset++;
    }

    return new Blob([view], { type: 'audio/wav' });
  };

  const applyAudioEffects = async (
    audioBuffer: AudioBuffer,
    reverb: string,
    echo: string,
    pitch: string
): Promise<AudioBuffer> => {
    const pitchRate = pitch === 'normal' ? 1.0 : (pitch === 'low' ? 0.8 : 1.25);
    const newLength = Math.ceil(audioBuffer.length / pitchRate);

    const offlineCtx = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        newLength,
        audioBuffer.sampleRate
    );

    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.playbackRate.value = pitchRate;

    let lastNode: AudioNode = source;

    if (reverb !== 'none') {
        const convolver = offlineCtx.createConvolver();
        const impulseLength = reverb === 'small' ? 2 : 4;
        const impulseDecay = reverb === 'small' ? 2 : 4;
        const impulseBuffer = offlineCtx.createBuffer(
            audioBuffer.numberOfChannels, 
            offlineCtx.sampleRate * impulseLength, 
            offlineCtx.sampleRate
        );
        for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
            const channelData = impulseBuffer.getChannelData(c);
            for (let i = 0; i < channelData.length; i++) {
                channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / channelData.length, impulseDecay);
            }
        }
        convolver.buffer = impulseBuffer;
        lastNode.connect(convolver);
        lastNode = convolver;
    }

    if (echo !== 'none') {
        const delay = offlineCtx.createDelay(1.0);
        const feedback = offlineCtx.createGain();
        const wetLevel = offlineCtx.createGain();
        const dryLevel = offlineCtx.createGain();

        delay.delayTime.value = echo === 'subtle' ? 0.25 : 0.5;
        feedback.gain.value = echo === 'subtle' ? 0.3 : 0.5;
        wetLevel.gain.value = 0.4;
        dryLevel.gain.value = 0.6;
        
        lastNode.connect(dryLevel);
        dryLevel.connect(offlineCtx.destination);
        
        lastNode.connect(delay);
        delay.connect(wetLevel);
        wetLevel.connect(offlineCtx.destination);
        
        delay.connect(feedback);
        feedback.connect(delay);
        
        lastNode = offlineCtx.destination; 
    }
    
    if (lastNode !== offlineCtx.destination) {
        lastNode.connect(offlineCtx.destination);
    }
    
    source.start(0);

    return await offlineCtx.startRendering();
};

  const normalizeAudioBuffer = (audioBuffer: AudioBuffer): AudioBuffer => {
    const audioCtx = new AudioContext();
    const normalizedBuffer = audioCtx.createBuffer(
        audioBuffer.numberOfChannels,
        audioBuffer.length,
        audioBuffer.sampleRate
    );

    let maxAmplitude = 0;
    for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
        const channelData = audioBuffer.getChannelData(c);
        for (let s = 0; s < channelData.length; s++) {
            if (Math.abs(channelData[s]) > maxAmplitude) {
                maxAmplitude = Math.abs(channelData[s]);
            }
        }
    }
    
    if (maxAmplitude > 0) {
        const gain = 0.98 / maxAmplitude; // Normalize to -0.1 dBFS peak to avoid clipping
        for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
            const inputData = audioBuffer.getChannelData(c);
            const outputData = normalizedBuffer.getChannelData(c);
            for (let s = 0; s < inputData.length; s++) {
                outputData[s] = inputData[s] * gain;
            }
        }
    } else {
        // If silent, just copy it over.
        for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
            normalizedBuffer.copyToChannel(audioBuffer.getChannelData(c), c);
        }
    }
    
    return normalizedBuffer;
  };

  const generateAudio = async () => {
      const prompt = promptInput.value;
      if (!prompt) {
          showError("Please enter some text to generate audio.");
          return;
      }
      
      const duration = getAudioDurationSeconds();
      const reverb = getSelectedAudioReverb();
      const echo = getSelectedAudioEcho();
      const pitch = getSelectedAudioPitch();

      setLoading(true, "Generating base audio...");
      try {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 1500)); 
          const audioBlob = createPlaceholderWavBlob(duration);
          
          // Decode for processing
          const audioContext = new AudioContext();
          const rawBuffer = await audioBlob.arrayBuffer();
          let decodedBuffer = await audioContext.decodeAudioData(rawBuffer);

          // Normalization Step
          setLoading(true, "Normalizing audio volume...");
          await new Promise(resolve => setTimeout(resolve, 500)); // Simulate processing time
          decodedBuffer = normalizeAudioBuffer(decodedBuffer);
          
          const hasEffects = reverb !== 'none' || echo !== 'none' || pitch !== 'normal';

          if (hasEffects) {
              setLoading(true, "Applying audio effects...");
              await new Promise(resolve => setTimeout(resolve, 500)); // Simulate processing time
              decodedBuffer = await applyAudioEffects(decodedBuffer, reverb, echo, pitch);
          }
          
          setLoading(true, "Encoding final audio file...");
          await new Promise(resolve => setTimeout(resolve, 200)); // Simulate processing time
          const finalAudioBlob = audioBufferToWav(decodedBuffer);
          
          const audioUrl = URL.createObjectURL(finalAudioBlob);
          displayAudioResult(audioUrl, prompt, finalAudioBlob);

      } catch (error) {
          console.error(error);
          showError("Failed to generate audio. Please try again.");
      } finally {
          setLoading(false);
      }
  };

  const generateVideo = async () => {
    let prompt = promptInput.value;
    if (!prompt) {
        showError("Please enter a prompt for the video.");
        return;
    }

    const quality = getSelectedVideoQuality();
    const style = getSelectedVideoStyle();
    const audioTrack = getSelectedAudioTrack();
    const aspectRatio = getSelectedVideoAspectRatio();
    const resolution = getSelectedVideoResolution();
    const duration = getSelectedVideoDuration();
    const ffmpegEnabled = ffmpegToggle.checked;
    const ffmpegCommands = ffmpegCommandsInput.value;
    const textOverlayEnabled = textOverlayToggle.checked;
    const textOverlayText = textOverlayInput.value;
    const selectedPositionRadio = document.querySelector('input[name="text-overlay-position"]:checked') as HTMLInputElement;
    const textOverlayPosition = selectedPositionRadio.value;
    const chromaKeyEnabled = videoChromaKeyToggle.checked;
    const chromaKeyColor = videoChromaKeyColorPicker.value;
    
    let audioPromptModifier = '';
    switch (audioTrack) {
        case 'cinematic-music':
            audioPromptModifier = ', epic cinematic score, orchestral background music';
            break;
        case 'upbeat-music':
            audioPromptModifier = ', upbeat and energetic electronic background music';
            break;
        case 'ambient-sound':
            audioPromptModifier = ', realistic ambient sounds, immersive environmental audio';
            break;
        case 'sfx':
            audioPromptModifier = ', with sound effects matching the action';
            break;
        case 'none':
        default:
            audioPromptModifier = '';
            break;
    }

    let durationModifier = '';
    switch (duration) {
      case 'short':
        durationModifier = ', a short 5-second video clip';
        break;
      case 'medium':
        durationModifier = ', a 10-second video clip';
        break;
      case 'long':
        durationModifier = ', a 15-second long video';
        break;
    }

    let ffmpegModifier = '';
    if (ffmpegEnabled && ffmpegCommands.trim()) {
        ffmpegModifier = `, apply these post-processing instructions: ${ffmpegCommands.trim()}`;
    }
    
    let textOverlayModifier = '';
    if (textOverlayEnabled && textOverlayText.trim()) {
        textOverlayModifier = `, with the text "${textOverlayText.trim()}" overlaid in the ${textOverlayPosition}`;
    }

    let chromaKeyModifier = '';
    if (chromaKeyEnabled) {
        chromaKeyModifier = `, with a solid ${chromaKeyColor} background for chroma keying`;
    }

    const qualityPromptModifier = quality === 'high' ? ', cinematic, best quality' : '';
    const stylePromptModifier = `, ${style} style`;
    const aspectRatioModifier = `, ${aspectRatio} aspect ratio`;
    const resolutionModifier = resolution === '1080p' ? ', 1080p, full hd, 4k' : ', 720p, hd';
    const finalPrompt = prompt + stylePromptModifier + qualityPromptModifier + audioPromptModifier + aspectRatioModifier + resolutionModifier + durationModifier + ffmpegModifier + textOverlayModifier + chromaKeyModifier;

    setLoading(true, "Starting video generation...");
    try {
        let operation = await ai.models.generateVideos({
            model: 'veo-2.0-generate-001',
            prompt: finalPrompt,
            config: {
                numberOfVideos: 1
            }
        });
        
        const videoLoadingMessages = [
            "Warming up the digital cameras...",
            "Rendering pixels into motion...",
            "This can take a few minutes, please wait...",
            "Composing the final cut...",
            "Almost there, adding the finishing touches..."
        ];
        let messageIndex = 0;

        while (!operation.done) {
            setLoading(true, videoLoadingMessages[messageIndex % videoLoadingMessages.length]);
            messageIndex++;
            await new Promise(resolve => setTimeout(resolve, 120000)); // 120-second polling
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (downloadLink) {
            setLoading(true, "Downloading video file...");
            const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
            if (!response.ok) {
                throw new Error(`Failed to download video: ${response.statusText}`);
            }
            const videoBlob = await response.blob();
            const videoUrl = URL.createObjectURL(videoBlob);
            displayVideoResult(videoUrl, prompt, videoBlob);
        } else {
            throw new Error("Video generation completed, but no download link was provided.");
        }

    } catch (error) {
        console.error(error);
        showError("Failed to generate video. Please try again.");
    } finally {
        setLoading(false);
    }
  };

  const generateImage = async () => {
    const prompt = promptInput.value;
    const negativePrompt = negativePromptInput.value;

    if (!prompt) {
      showError("Please enter a prompt for the icon.");
      return;
    }

    if (currentState) {
      undoStack.push(currentState);
    }

    setLoading(true, "Generating your icon...");
    const isTransparent = transparencyToggle.checked;
    let outputMimeType = getSelectedFormat();
    const aspectRatio = aspectRatioSelect.value as AspectRatio;
    const iconStyle = getSelectedStyle();
    const quality = getSelectedQuality();
    const backgroundColor = backgroundColorPicker.value;
    const numberOfIcons = getSelectedNumberOfIcons();
    
    let backgroundPrompt = '';
    if (isTransparent) {
      outputMimeType = 'image/png'; // Force PNG for transparency
      backgroundPrompt = ', transparent background';
    } else if (backgroundColor.toLowerCase() !== DEFAULT_BACKGROUND_COLOR) {
      backgroundPrompt = `, solid ${backgroundColor} background`;
    }

    const qualityPromptModifier = quality === 'high' ? ', high detail, intricate, best quality, 4k' : '';
    
    let finalPrompt = [prompt, iconStyle, qualityPromptModifier].filter(Boolean).join(', ') + backgroundPrompt;
    if (negativePrompt) {
        finalPrompt += `. Do not include the following: ${negativePrompt}`;
    }

    try {
      const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: finalPrompt,
        config: {
          numberOfImages: numberOfIcons,
          outputMimeType: outputMimeType,
          aspectRatio: aspectRatio,
        },
      });

      const imageUrls: string[] = response.generatedImages.map(img => `data:${outputMimeType};base64,${img.image.imageBytes}`);
      const generationId = Date.now();

      currentState = {
        prompt,
        negativePrompt,
        imageUrls,
        format: outputMimeType,
        aspectRatio,
        iconStyle: iconStyle,
        quality: quality,
        backgroundColor: backgroundColor,
        transparentBackground: isTransparent,
        numberOfIcons: numberOfIcons,
        generationId,
      };

      displayState(currentState);
      addToPromptHistory(prompt);
      populatePromptHistoryDatalist();
      redoStack = [];

    } catch (error) {
      console.error(error);
      let userMessage = "Failed to generate the image. Please try again.";

      if (error instanceof Error && error.message) {
        const lowerCaseMessage = error.message.toLowerCase();
        if (lowerCaseMessage.includes('api key not valid')) {
            userMessage = "The API key is invalid. Please check the application configuration.";
        } else if (lowerCaseMessage.includes('prompt was blocked')) {
            userMessage = "Your prompt was blocked for safety reasons. Please modify your prompt and try again.";
        } else if (lowerCaseMessage.includes('quota') || lowerCaseMessage.includes('resource_exhausted')) {
            userMessage = "The API quota has been exceeded. Please try again later.";
        }
      }
      
      showError(userMessage);
    } finally {
      setLoading(false);
    }
  };

  const setLoading = (isLoading: boolean, message: string | null = null) => {
    if (isLoading) {
      generateBtn.disabled = true;
      clearBtn.disabled = true;
      undoBtn.disabled = true;
      redoBtn.disabled = true;
      if (downloadAllBtn) downloadAllBtn.disabled = true;
      loadingContainer?.classList.remove('hidden');
      loadingMessage!.textContent = message || '';
      loadingMessage?.classList.toggle('hidden', !message);
      resultContent?.classList.add('hidden');
      errorMessage?.classList.add('hidden');
    } else {
      clearBtn.disabled = false;
      if (downloadAllBtn) downloadAllBtn.disabled = false;
      updateButtonStates();
      loadingContainer?.classList.add('hidden');

      setTimeout(() => {
          const stillLoading = !loadingContainer?.classList.contains('hidden');
          if (!stillLoading) {
              const hasPrompt = promptInput.value.trim().length > 0;
              generateBtn.disabled = !hasPrompt;
          }
      }, 30000); 
    }
  };

  const displayAudioResult = (audioUrl: string, prompt: string, audioBlob: Blob) => {
    if (!mediaContainer || !resultContent) return;
    mediaContainer.innerHTML = '';
    mediaContainer.setAttribute('data-layout', 'single');
    if (downloadAllBtn) downloadAllBtn.classList.add('hidden');

    const itemWrapper = document.createElement('div');
    itemWrapper.className = 'audio-result-item';

    const audio = document.createElement('audio');
    audio.src = audioUrl;
    audio.controls = true;

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'download-btn-audio';
    downloadBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
        <span>Download Audio</span>
    `;
    downloadBtn.addEventListener('click', () => {
      const sanitizedPrompt = prompt.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').substring(0, 50) || 'ai-audio';
      const timestamp = Date.now();
      const filename = `${sanitizedPrompt}-${timestamp}.wav`;

      const link = document.createElement('a');
      link.href = URL.createObjectURL(audioBlob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    });

    itemWrapper.appendChild(audio);
    itemWrapper.appendChild(downloadBtn);
    mediaContainer.appendChild(itemWrapper);

    resultContent.classList.remove('hidden');
  };

  const displayVideoResult = (videoUrl: string, prompt: string, videoBlob: Blob) => {
    if (!mediaContainer || !resultContent) return;
    mediaContainer.innerHTML = '';
    mediaContainer.setAttribute('data-layout', 'single');
    if (downloadAllBtn) downloadAllBtn.classList.add('hidden');

    const itemWrapper = document.createElement('div');
    itemWrapper.className = 'video-result-item';

    const video = document.createElement('video');
    video.src = videoUrl;
    video.controls = true;
    video.autoplay = true;
    video.muted = true;
    video.loop = true;
    video.setAttribute('playsinline', '');

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'download-btn-video';
    downloadBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
        <span>Download Video</span>
    `;
    downloadBtn.addEventListener('click', () => {
      const sanitizedPrompt = prompt.trim().toLowerCase().replace(/[^a-z0-0-]/g, '-').substring(0, 50) || 'ai-video';
      const timestamp = Date.now();
      const filename = `${sanitizedPrompt}-${timestamp}.mp4`;

      const link = document.createElement('a');
      link.href = URL.createObjectURL(videoBlob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    });

    itemWrapper.appendChild(video);
    itemWrapper.appendChild(downloadBtn);
    mediaContainer.appendChild(itemWrapper);

    resultContent.classList.remove('hidden');
  };

  const downloadImage = (state: AppState, index: number) => {
    const url = state.imageUrls[index];
    const sanitizedPrompt = state.prompt.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').substring(0, 50) || 'ai-icon';
    const style = state.iconStyle.split(' ')[0];
    const aspectRatio = state.aspectRatio.replace(':', 'x');
    const extension = state.format === 'image/png' ? 'png' : 'jpg';
    const filename = `${sanitizedPrompt}-${style}-${aspectRatio}-${state.generationId}-${index + 1}.${extension}`;
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAllAsZip = async () => {
    if (!currentState || currentState.imageUrls.length <= 1) return;
    
    setLoading(true, 'Zipping files...');
    try {
        const zip = new JSZip();
        for (let i = 0; i < currentState.imageUrls.length; i++) {
            const url = currentState.imageUrls[i];
            const sanitizedPrompt = currentState.prompt.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').substring(0, 50) || 'ai-icon';
            const style = currentState.iconStyle.split(' ')[0];
            const aspectRatio = currentState.aspectRatio.replace(':', 'x');
            const extension = currentState.format === 'image/png' ? 'png' : 'jpg';
            const filename = `${sanitizedPrompt}-${style}-${aspectRatio}-${currentState.generationId}-${i + 1}.${extension}`;
            
            const response = await fetch(url);
            const blob = await response.blob();
            zip.file(filename, blob);
        }
        
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zipFilename = `${(currentState.prompt.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').substring(0, 50) || 'ai-icons')}-${currentState.generationId}.zip`;
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(zipBlob);
        link.download = zipFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

    } catch (e) {
        console.error("Failed to create zip file:", e);
        showError('Failed to create zip file.');
    } finally {
        setLoading(false);
    }
  };

  const displayState = (state: AppState) => {
    if (!mediaContainer || !resultContent) return;
    
    currentState = state;

    promptInput.value = state.prompt;
    negativePromptInput.value = state.negativePrompt;
    aspectRatioSelect.value = state.aspectRatio;
    backgroundColorPicker.value = state.backgroundColor;
    transparencyToggle.checked = state.transparentBackground;
    
    if (state.format === 'image/jpeg') {
        (document.getElementById('format-jpeg') as HTMLInputElement).checked = true;
    } else {
        (document.getElementById('format-png') as HTMLInputElement).checked = true;
    }

    const styleRadio = document.querySelector(`input[name="icon-style"][value="${state.iconStyle}"]`) as HTMLInputElement;
    if (styleRadio) styleRadio.checked = true;
    
    const qualityRadio = document.querySelector(`input[name="quality"][value="${state.quality}"]`) as HTMLInputElement;
    if (qualityRadio) qualityRadio.checked = true;

    const numberRadio = document.querySelector(`input[name="number-of-icons"][value="${state.numberOfIcons}"]`) as HTMLInputElement;
    if (numberRadio) numberRadio.checked = true;

    mediaContainer.innerHTML = '';
    mediaContainer.setAttribute('data-layout', state.imageUrls.length > 1 ? 'grid' : 'single');

    state.imageUrls.forEach((url, index) => {
        const itemWrapper = document.createElement('div');
        itemWrapper.className = 'icon-grid-item';

        const img = document.createElement('img');
        img.src = url;
        img.alt = `Generated Icon: ${state.prompt}`;
        
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'download-btn-grid';
        downloadBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
            <span>Download</span>
        `;
        downloadBtn.addEventListener('click', () => downloadImage(state, index));

        itemWrapper.appendChild(img);
        itemWrapper.appendChild(downloadBtn);
        mediaContainer.appendChild(itemWrapper);
    });

    if (downloadAllBtn) {
        downloadAllBtn.classList.toggle('hidden', state.imageUrls.length <= 1);
    }

    resultContent.classList.remove('hidden');
    errorMessage?.classList.add('hidden');
    updateButtonStates();
  };

  const clearUI = () => {
    promptInput.value = '';
    negativePromptInput.value = '';
    
    if(mediaContainer) mediaContainer.innerHTML = '';
    if(resultContent) resultContent.classList.add('hidden');
    if(errorMessage) errorMessage.classList.add('hidden');
    
    (document.getElementById('style-flat') as HTMLInputElement).checked = true;
    (document.getElementById('quality-standard') as HTMLInputElement).checked = true;
    (document.getElementById('format-jpeg') as HTMLInputElement).checked = true;
    (document.getElementById('number-1') as HTMLInputElement).checked = true;
    aspectRatioSelect.value = '1:1';
    backgroundColorPicker.value = DEFAULT_BACKGROUND_COLOR;
    transparencyToggle.checked = false;
    
    (document.getElementById('video-style-cinematic') as HTMLInputElement).checked = true;
    (document.getElementById('video-quality-standard') as HTMLInputElement).checked = true;
    (document.getElementById('video-resolution-720p') as HTMLInputElement).checked = true;
    (document.getElementById('video-duration-medium') as HTMLInputElement).checked = true;
    (document.getElementById('audio-track-none') as HTMLInputElement).checked = true;
    (document.getElementById('video-aspect-16x9') as HTMLInputElement).checked = true;
    ffmpegToggle.checked = false;
    ffmpegCommandsInput.value = '';
    ffmpegCommandsInput.disabled = true;
    textOverlayToggle.checked = false;
    textOverlayInput.value = '';
    textOverlayInput.disabled = true;
    textOverlayPositionRadios.forEach(radio => (radio as HTMLInputElement).disabled = true);
    (document.querySelector('input[name="text-overlay-position"]') as HTMLInputElement).checked = true;
    videoChromaKeyToggle.checked = false;
    videoChromaKeyColorPicker.disabled = true;

    (document.getElementById('voice-male') as HTMLInputElement).checked = true;
    (document.getElementById('accent-american') as HTMLInputElement).checked = true;
    (document.getElementById('tone-professional') as HTMLInputElement).checked = true;
    audioDurationInput.value = '10';
    (document.getElementById('reverb-none') as HTMLInputElement).checked = true;
    (document.getElementById('echo-none') as HTMLInputElement).checked = true;
    (document.getElementById('pitch-normal') as HTMLInputElement).checked = true;

    currentState = null;
    undoStack = [];
    redoStack = [];
    localStorage.removeItem(SESSION_STORAGE_KEY);
    updateButtonStates();
  };

  const undo = () => {
    if (undoStack.length > 0) {
      const prevState = undoStack.pop();
      if(currentState) {
        redoStack.push(currentState);
      }
      displayState(prevState!);
    }
  };

  const redo = () => {
    if (redoStack.length > 0) {
      const nextState = redoStack.pop();
      if (currentState) {
        undoStack.push(currentState);
      }
      displayState(nextState!);
    }
  };

  const getPresets = (): Preset[] => {
    try {
        const storedPresets = localStorage.getItem(PRESETS_STORAGE_KEY);
        return storedPresets ? JSON.parse(storedPresets) : [];
    } catch (e) {
        console.error("Failed to parse presets:", e);
        return [];
    }
  };

  const savePresets = (presets: Preset[]) => {
      try {
          localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
      } catch (e) {
          console.error("Failed to save presets:", e);
      }
  };

  const populatePresetsDropdown = () => {
    const presets = getPresets();
    presetsSelect.innerHTML = '<option value="">Load a preset...</option>';
    presets.forEach(preset => {
        const option = document.createElement('option');
        option.value = preset.name;
        option.textContent = preset.name;
        presetsSelect.appendChild(option);
    });
    deletePresetBtn.disabled = true;
  };
  
  const savePreset = () => {
    const name = presetNameInput.value.trim();
    if (!name) {
      showError("Please enter a name for the preset.");
      return;
    }
    
    const newPreset: Preset = {
      name,
      mode: currentMode,
      prompt: promptInput.value,
    };

    if (currentMode === 'icon') {
        newPreset.negativePrompt = negativePromptInput.value;
        newPreset.format = getSelectedFormat();
        newPreset.aspectRatio = aspectRatioSelect.value as AspectRatio;
        newPreset.iconStyle = getSelectedStyle();
        newPreset.quality = getSelectedQuality();
        newPreset.backgroundColor = backgroundColorPicker.value;
        newPreset.transparentBackground = transparencyToggle.checked;
        newPreset.numberOfIcons = getSelectedNumberOfIcons();
    } else if (currentMode === 'video') {
        newPreset.videoQuality = getSelectedVideoQuality();
        newPreset.videoStyle = getSelectedVideoStyle();
        newPreset.videoAudioTrack = getSelectedAudioTrack();
        newPreset.videoAspectRatio = getSelectedVideoAspectRatio();
        newPreset.videoResolution = getSelectedVideoResolution();
        newPreset.videoDuration = getSelectedVideoDuration();
        newPreset.videoFfmpegEnabled = ffmpegToggle.checked;
        newPreset.videoFfmpegCommands = ffmpegCommandsInput.value;
        newPreset.videoTextOverlayEnabled = textOverlayToggle.checked;
        newPreset.videoTextOverlayText = textOverlayInput.value;
        newPreset.videoTextOverlayPosition = (document.querySelector('input[name="text-overlay-position"]:checked') as HTMLInputElement)?.value;
        newPreset.videoChromaKeyEnabled = videoChromaKeyToggle.checked;
        newPreset.videoChromaKeyColor = videoChromaKeyColorPicker.value;
    } else if (currentMode === 'audio') {
        newPreset.audioVoice = getSelectedAudioVoice();
        newPreset.audioAccent = getSelectedAudioAccent();
        newPreset.audioTone = getSelectedAudioTone();
        newPreset.audioDurationSeconds = getAudioDurationSeconds();
        newPreset.audioReverb = getSelectedAudioReverb();
        newPreset.audioEcho = getSelectedAudioEcho();
        newPreset.audioPitch = getSelectedAudioPitch();
    }

    let presets = getPresets();
    const existingIndex = presets.findIndex(p => p.name === name);
    if (existingIndex > -1) {
      presets[existingIndex] = newPreset;
    } else {
      presets.push(newPreset);
    }

    savePresets(presets);
    populatePresetsDropdown();
    presetsSelect.value = name;
    presetNameInput.value = '';
    deletePresetBtn.disabled = false;
  };

  const loadPreset = (name: string) => {
    const presets = getPresets();
    const preset = presets.find(p => p.name === name);
    if (preset) {
      switchMode(preset.mode, true);

      promptInput.value = preset.prompt;

      if (preset.mode === 'icon') {
        negativePromptInput.value = preset.negativePrompt ?? '';
        if(preset.format) (document.querySelector(`input[name="format"][value="${preset.format}"]`) as HTMLInputElement).checked = true;
        if(preset.aspectRatio) aspectRatioSelect.value = preset.aspectRatio;
        if(preset.iconStyle) (document.querySelector(`input[name="icon-style"][value="${preset.iconStyle}"]`) as HTMLInputElement).checked = true;
        if(preset.quality) (document.querySelector(`input[name="quality"][value="${preset.quality}"]`) as HTMLInputElement).checked = true;
        if(preset.backgroundColor) backgroundColorPicker.value = preset.backgroundColor;
        if(typeof preset.transparentBackground === 'boolean') transparencyToggle.checked = preset.transparentBackground;
        if(preset.numberOfIcons) (document.querySelector(`input[name="number-of-icons"][value="${preset.numberOfIcons}"]`) as HTMLInputElement).checked = true;
      } else if (preset.mode === 'video') {
        if (preset.videoQuality) (document.querySelector(`input[name="video-quality"][value="${preset.videoQuality}"]`) as HTMLInputElement).checked = true;
        if (preset.videoStyle) (document.querySelector(`input[name="video-style"][value="${preset.videoStyle}"]`) as HTMLInputElement).checked = true;
        if (preset.videoAudioTrack) (document.querySelector(`input[name="video-audio-track"][value="${preset.videoAudioTrack}"]`) as HTMLInputElement).checked = true;
        if (preset.videoAspectRatio) (document.querySelector(`input[name="video-aspect-ratio"][value="${preset.videoAspectRatio}"]`) as HTMLInputElement).checked = true;
        if (preset.videoResolution) (document.querySelector(`input[name="video-resolution"][value="${preset.videoResolution}"]`) as HTMLInputElement).checked = true;
        if (preset.videoDuration) (document.querySelector(`input[name="video-duration"][value="${preset.videoDuration}"]`) as HTMLInputElement).checked = true;
        if (typeof preset.videoFfmpegEnabled === 'boolean') ffmpegToggle.checked = preset.videoFfmpegEnabled;
        ffmpegCommandsInput.value = preset.videoFfmpegCommands ?? '';
        ffmpegCommandsInput.disabled = !ffmpegToggle.checked;
        if (typeof preset.videoTextOverlayEnabled === 'boolean') textOverlayToggle.checked = preset.videoTextOverlayEnabled;
        textOverlayInput.value = preset.videoTextOverlayText ?? '';
        textOverlayInput.disabled = !textOverlayToggle.checked;
        textOverlayPositionRadios.forEach(radio => (radio as HTMLInputElement).disabled = !textOverlayToggle.checked);
        if(preset.videoTextOverlayPosition) (document.querySelector(`input[name="text-overlay-position"][value="${preset.videoTextOverlayPosition}"]`) as HTMLInputElement).checked = true;
        if (typeof preset.videoChromaKeyEnabled === 'boolean') videoChromaKeyToggle.checked = preset.videoChromaKeyEnabled;
        videoChromaKeyColorPicker.value = preset.videoChromaKeyColor ?? '#00ff00';
        videoChromaKeyColorPicker.disabled = !videoChromaKeyToggle.checked;
      } else if (preset.mode === 'audio') {
        if (preset.audioVoice) (document.querySelector(`input[name="audio-voice"][value="${preset.audioVoice}"]`) as HTMLInputElement).checked = true;
        if (preset.audioAccent) (document.querySelector(`input[name="audio-accent"][value="${preset.audioAccent}"]`) as HTMLInputElement).checked = true;
        if (preset.audioTone) (document.querySelector(`input[name="audio-tone"][value="${preset.audioTone}"]`) as HTMLInputElement).checked = true;
        if (preset.audioDurationSeconds) audioDurationInput.value = String(preset.audioDurationSeconds);
        if (preset.audioReverb) (document.querySelector(`input[name="audio-reverb"][value="${preset.audioReverb}"]`) as HTMLInputElement).checked = true;
        if (preset.audioEcho) (document.querySelector(`input[name="audio-echo"][value="${preset.audioEcho}"]`) as HTMLInputElement).checked = true;
        if (preset.audioPitch) (document.querySelector(`input[name="audio-pitch"][value="${preset.audioPitch}"]`) as HTMLInputElement).checked = true;
      }
      
      updateButtonStates();
      saveSessionState();
    }
  };

  const deletePreset = () => {
    const name = presetsSelect.value;
    if (!name) return;
    
    let presets = getPresets();
    presets = presets.filter(p => p.name !== name);
    savePresets(presets);
    populatePresetsDropdown();
  };
  
  const saveSessionState = () => {
    const state: SessionState = {
        prompt: promptInput.value,
        negativePrompt: negativePromptInput.value,
        format: getSelectedFormat(),
        aspectRatio: aspectRatioSelect.value as AspectRatio,
        iconStyle: getSelectedStyle(),
        quality: getSelectedQuality(),
        backgroundColor: backgroundColorPicker.value,
        transparentBackground: transparencyToggle.checked,
        numberOfIcons: getSelectedNumberOfIcons(),
        currentMode: currentMode,
        videoQuality: getSelectedVideoQuality(),
        videoStyle: getSelectedVideoStyle(),
        videoAudioTrack: getSelectedAudioTrack(),
        videoAspectRatio: getSelectedVideoAspectRatio(),
        videoResolution: getSelectedVideoResolution(),
        videoDuration: getSelectedVideoDuration(),
        videoFfmpegEnabled: ffmpegToggle.checked,
        videoFfmpegCommands: ffmpegCommandsInput.value,
        videoTextOverlayEnabled: textOverlayToggle.checked,
        videoTextOverlayText: textOverlayInput.value,
        videoTextOverlayPosition: (document.querySelector('input[name="text-overlay-position"]:checked') as HTMLInputElement)?.value,
        videoChromaKeyEnabled: videoChromaKeyToggle.checked,
        videoChromaKeyColor: videoChromaKeyColorPicker.value,
        audioVoice: getSelectedAudioVoice(),
        audioAccent: getSelectedAudioAccent(),
        audioTone: getSelectedAudioTone(),
        audioDurationSeconds: getAudioDurationSeconds(),
        audioReverb: getSelectedAudioReverb(),
        audioEcho: getSelectedAudioEcho(),
        audioPitch: getSelectedAudioPitch(),
    };
    try {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.error("Failed to save session state:", e);
    }
  };

  const loadSessionState = () => {
    try {
        const storedState = localStorage.getItem(SESSION_STORAGE_KEY);
        if (storedState) {
            const state: SessionState = JSON.parse(storedState);
            promptInput.value = state.prompt;
            negativePromptInput.value = state.negativePrompt ?? '';
            
            if (state.format) {
                (document.querySelector(`input[name="format"][value="${state.format}"]`) as HTMLInputElement).checked = true;
            }
            if (state.aspectRatio) aspectRatioSelect.value = state.aspectRatio;
            if (state.iconStyle) {
                (document.querySelector(`input[name="icon-style"][value="${state.iconStyle}"]`) as HTMLInputElement).checked = true;
            }
            if (state.quality) {
                (document.querySelector(`input[name="quality"][value="${state.quality}"]`) as HTMLInputElement).checked = true;
            }
            if (state.backgroundColor) backgroundColorPicker.value = state.backgroundColor;
            if (typeof state.transparentBackground === 'boolean') transparencyToggle.checked = state.transparentBackground;
            if (state.numberOfIcons) {
              const radio = document.querySelector(`input[name="number-of-icons"][value="${state.numberOfIcons}"]`) as HTMLInputElement;
              if (radio) radio.checked = true;
            }
            
            if (state.videoQuality) (document.querySelector(`input[name="video-quality"][value="${state.videoQuality}"]`) as HTMLInputElement).checked = true;
            if (state.videoStyle) (document.querySelector(`input[name="video-style"][value="${state.videoStyle}"]`) as HTMLInputElement).checked = true;
            if (state.videoAudioTrack) (document.querySelector(`input[name="video-audio-track"][value="${state.videoAudioTrack}"]`) as HTMLInputElement).checked = true;
            if (state.videoAspectRatio) (document.querySelector(`input[name="video-aspect-ratio"][value="${state.videoAspectRatio}"]`) as HTMLInputElement).checked = true;
            if (state.videoResolution) (document.querySelector(`input[name="video-resolution"][value="${state.videoResolution}"]`) as HTMLInputElement).checked = true;
            if (state.videoDuration) (document.querySelector(`input[name="video-duration"][value="${state.videoDuration}"]`) as HTMLInputElement).checked = true;
            if (typeof state.videoFfmpegEnabled === 'boolean') ffmpegToggle.checked = state.videoFfmpegEnabled;
            ffmpegCommandsInput.value = state.videoFfmpegCommands ?? '';
            ffmpegCommandsInput.disabled = !ffmpegToggle.checked;
            if (typeof state.videoTextOverlayEnabled === 'boolean') textOverlayToggle.checked = state.videoTextOverlayEnabled;
            textOverlayInput.value = state.videoTextOverlayText ?? '';
            textOverlayInput.disabled = !textOverlayToggle.checked;
            textOverlayPositionRadios.forEach(radio => (radio as HTMLInputElement).disabled = !textOverlayToggle.checked);
            if(state.videoTextOverlayPosition) (document.querySelector(`input[name="text-overlay-position"][value="${state.videoTextOverlayPosition}"]`) as HTMLInputElement).checked = true;
            if (typeof state.videoChromaKeyEnabled === 'boolean') videoChromaKeyToggle.checked = state.videoChromaKeyEnabled;
            videoChromaKeyColorPicker.value = state.videoChromaKeyColor ?? '#00ff00';
            videoChromaKeyColorPicker.disabled = !videoChromaKeyToggle.checked;

            if (state.audioVoice) (document.querySelector(`input[name="audio-voice"][value="${state.audioVoice}"]`) as HTMLInputElement).checked = true;
            if (state.audioAccent) (document.querySelector(`input[name="audio-accent"][value="${state.audioAccent}"]`) as HTMLInputElement).checked = true;
            if (state.audioTone) (document.querySelector(`input[name="audio-tone"][value="${state.audioTone}"]`) as HTMLInputElement).checked = true;
            if (state.audioDurationSeconds) {
                audioDurationInput.value = String(state.audioDurationSeconds);
            } else if (state.audioDuration) { // Backward compatibility
                audioDurationInput.value = state.audioDuration === 'short' ? '5' : (state.audioDuration === 'long' ? '15' : '10');
            }
            if (state.audioReverb) (document.querySelector(`input[name="audio-reverb"][value="${state.audioReverb}"]`) as HTMLInputElement).checked = true;
            if (state.audioEcho) (document.querySelector(`input[name="audio-echo"][value="${state.audioEcho}"]`) as HTMLInputElement).checked = true;
            if (state.audioPitch) (document.querySelector(`input[name="audio-pitch"][value="${state.audioPitch}"]`) as HTMLInputElement).checked = true;


            switchMode(state.currentMode || 'icon', true);
        }
    } catch (e) {
        console.error("Failed to load session state:", e);
    }
  };

  const switchMode = (newMode: AppMode, isInitialLoad = false) => {
    currentMode = newMode;
    
    modeIconBtn.classList.toggle('active', newMode === 'icon');
    modeVideoBtn.classList.toggle('active', newMode === 'video');
    modeAudioBtn.classList.toggle('active', newMode === 'audio');

    modeIconBtn.setAttribute('aria-pressed', String(newMode === 'icon'));
    modeVideoBtn.setAttribute('aria-pressed', String(newMode === 'video'));
    modeAudioBtn.setAttribute('aria-pressed', String(newMode === 'audio'));

    iconOptionsContainer?.classList.toggle('hidden', newMode !== 'icon');
    videoOptionsContainer?.classList.toggle('hidden', newMode !== 'video');
    audioOptionsContainer?.classList.toggle('hidden', newMode !== 'audio');

    undoBtn.classList.toggle('hidden', newMode !== 'icon');
    redoBtn.classList.toggle('hidden', newMode !== 'icon');
    
    const generateBtnText = document.querySelector('#generate-btn span');
    if (generateBtnText) {
      if (newMode === 'icon') generateBtnText.textContent = 'Generate Icon';
      else if (newMode === 'video') generateBtnText.textContent = 'Generate Video';
      else generateBtnText.textContent = 'Generate Audio';
    }
    
    if (!isInitialLoad) {
      if(mediaContainer) mediaContainer.innerHTML = '';
      if(resultContent) resultContent.classList.add('hidden');
      if(errorMessage) errorMessage.classList.add('hidden');
      saveSessionState();
    }
    updateButtonStates();
  };
  
  const handleKeyDown = (event: KeyboardEvent) => {
    const isModifier = event.ctrlKey || event.metaKey;

    if (isModifier && event.key === 'Enter') {
      event.preventDefault();
      if (!generateBtn.disabled) {
        handleGeneration();
      }
    } else if (isModifier && event.key === 'z') {
      event.preventDefault();
      if (!undoBtn.disabled) {
        undo();
      }
    } else if (isModifier && (event.key === 'y' || (event.shiftKey && event.key === 'Z'))) {
      event.preventDefault();
      if (!redoBtn.disabled) {
        redo();
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      if (!clearBtn.disabled) {
        clearUI();
      }
    }
  };

  const suggestPrompt = () => {
    const suggestions = PROMPT_SUGGESTIONS[currentMode] || [];
    if (suggestions.length > 0) {
        const randomIndex = Math.floor(Math.random() * suggestions.length);
        promptInput.value = suggestions[randomIndex];
        updateButtonStates();
        saveSessionState();
    }
  };
  
  const initialize = () => {
    generateBtn.addEventListener('click', handleGeneration);
    clearBtn.addEventListener('click', clearUI);
    undoBtn.addEventListener('click', undo);
    redoBtn.addEventListener('click', redo);
    downloadAllBtn.addEventListener('click', downloadAllAsZip);
    suggestPromptBtn.addEventListener('click', suggestPrompt);

    savePresetBtn.addEventListener('click', savePreset);
    presetsSelect.addEventListener('change', () => {
        const selectedPreset = presetsSelect.value;
        if(selectedPreset) {
            loadPreset(selectedPreset);
            deletePresetBtn.disabled = false;
        } else {
            deletePresetBtn.disabled = true;
        }
    });
    deletePresetBtn.addEventListener('click', deletePreset);

    modeIconBtn.addEventListener('click', () => switchMode('icon'));
    modeVideoBtn.addEventListener('click', () => switchMode('video'));
    modeAudioBtn.addEventListener('click', () => switchMode('audio'));

    ffmpegToggle.addEventListener('change', () => {
        ffmpegCommandsInput.disabled = !ffmpegToggle.checked;
        saveSessionState();
    });
    
    textOverlayToggle.addEventListener('change', () => {
      const isDisabled = !textOverlayToggle.checked;
      textOverlayInput.disabled = isDisabled;
      textOverlayPositionRadios.forEach(radio => (radio as HTMLInputElement).disabled = isDisabled);
      saveSessionState();
    });
    
    videoChromaKeyToggle.addEventListener('change', () => {
        videoChromaKeyColorPicker.disabled = !videoChromaKeyToggle.checked;
        saveSessionState();
    });

    document.addEventListener('keydown', handleKeyDown);

    const inputsToSave = [
        promptInput, negativePromptInput, aspectRatioSelect, backgroundColorPicker,
        transparencyToggle, ffmpegCommandsInput, textOverlayInput,
        videoChromaKeyColorPicker, audioDurationInput
    ];
    inputsToSave.forEach(el => el.addEventListener('input', saveSessionState));
    
    const radiosAndCheckboxesToSave = document.querySelectorAll(
      'input[type="radio"], input[type="checkbox"]'
    );
    radiosAndCheckboxesToSave.forEach(el => el.addEventListener('change', saveSessionState));

    populatePresetsDropdown();
    populatePromptHistoryDatalist();
    loadSessionState();
    updateButtonStates();
    
    transparencyToggle.addEventListener('change', () => {
        backgroundColorPicker.disabled = transparencyToggle.checked;
        if (transparencyToggle.checked) {
            const pngRadio = document.getElementById('format-png') as HTMLInputElement;
            if(pngRadio) pngRadio.checked = true;
        }
        saveSessionState();
    });
    backgroundColorPicker.disabled = transparencyToggle.checked;
  };

  initialize();
};

App();