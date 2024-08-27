from io import BytesIO
from pydub import AudioSegment

def mp3ToWav(mp3Bytes: bytes) -> bytes:
    mp3Data = BytesIO(mp3Bytes)
    audio = AudioSegment.from_mp3(mp3Data)
    wavData = BytesIO()
    audio.export(wavData, format="wav")
    wavBytes = wavData.getvalue()
    return wavBytes

def wavToMp3(wavBytes: bytes) -> bytes:
    wavData = BytesIO(wavBytes)
    audio = AudioSegment.from_wav(wavData)
    mp3Data = BytesIO()
    audio.export(mp3Data, format="mp3")
    mp3Bytes = mp3Data.getvalue()
    return mp3Bytes