let sharedStream: MediaStream | null = null;
let pending: Promise<MediaStream> | null = null;

function isLive(stream: MediaStream | null): stream is MediaStream {
  return Boolean(
    stream?.getAudioTracks().some((track) => track.readyState === "live"),
  );
}

export function hasLiveMic(): boolean {
  return isLive(sharedStream);
}

export function getSharedMicStream(): MediaStream | null {
  return isLive(sharedStream) ? sharedStream : null;
}

export function disableMic(): void {
  if (!sharedStream) return;
  for (const track of sharedStream.getAudioTracks()) {
    track.stop();
  }
  sharedStream = null;
}

export async function ensureMicStream(): Promise<MediaStream> {
  if (isLive(sharedStream)) return sharedStream;
  if (pending) return pending;

  pending = navigator.mediaDevices
    .getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
      },
    })
    .then((stream) => {
      sharedStream = stream;
      for (const track of stream.getAudioTracks()) {
        track.addEventListener("ended", () => {
          if (sharedStream === stream) sharedStream = null;
        });
      }
      return stream;
    })
    .finally(() => {
      pending = null;
    });

  return pending;
}