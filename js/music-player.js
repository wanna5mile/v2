js:(async () => {
  "use strict";

  // === DOM references ===
  const now_playing = document.querySelector('.now-playing');
  const track_art = document.querySelector('.track-art');
  const coverEl = track_art.querySelector('.cover');
  const track_name = document.querySelector('.track-name');
  const track_artist = document.querySelector('.track-artist');
  const playpause_btn = document.querySelector('.playpause-track');
  const next_btn = document.querySelector('.next-track');
  const prev_btn = document.querySelector('.prev-track');
  const random_btn = document.querySelector('.random-track');
  const repeat_btn = document.querySelector('.repeat-track');
  const seek_slider = document.querySelector('.seek_slider');
  const volume_slider = document.querySelector('.volume_slider');
  const curr_time = document.querySelector('.current-time');
  const total_duration = document.querySelector('.total-duration');

  const curr_track = new Audio();
  let flat_music_list = [];
  let track_index = 0, isPlaying = false, isRandom = false, isRepeating = false, updateTimer = null;

  // === Fetch sheet data ===
  async function fetchSheetData() {
    try {
      const SHEET_API_URL = "https://script.google.com/macros/s/AKfycbzO_mlxSnqWv6mlvE0F0xBBUWXdvWx2hCzZ9C5XTGqXMV4DkBcqW7lW4MRQI2rnK41m/exec";
      const res = await fetch(SHEET_API_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to fetch sheet: ${res.status}`);
      const raw = await res.json();
      return raw.filter(row => Object.values(row).some(v => String(v || "").trim() !== ""));
    } catch (err) {
      console.error("Error fetching sheet data:", err);
      return [];
    }
  }

  // === Load / flatten sheet ===
  const sheetData = await fetchSheetData();

  sheetData.forEach((track, originalIndex) => {
    if (!track.file || track.file === "#") return;
    const files = Array.isArray(track.file) ? track.file : [track.file];
    files.forEach((file, part) => {
      flat_music_list.push({
        name: track.name || "Untitled",
        artist: track.artist || "Unknown",
        url: track.url || "#",
        artistUrl: track.artistUrl || "#",
        img: track.cover || "default-cover.png",
        musicSrc: (track.basePath || "./") + file,
        isMultiPart: files.length > 1,
        partIndex: part,
        originalIndex,
        lastPartIndex: files.length - 1
      });
    });
  });

  // === Helpers ===
  const formatTime = sec => {
    const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  };
  const reset = () => { curr_time.textContent = total_duration.textContent = "00:00"; seek_slider.value = 0; };

  // === Track Loader / Updater ===
  function loadTrack(index) {
    clearInterval(updateTimer);
    reset();
    if (index < 0) index = flat_music_list.length - 1;
    if (index >= flat_music_list.length) index = 0;
    track_index = index;

    const track = flat_music_list[index];
    curr_track.src = track.musicSrc;
    curr_track.load();

    curr_track.onloadedmetadata = () => {
      total_duration.textContent = formatTime(curr_track.duration);
      const logicalCount = flat_music_list.filter((t, i) => i <= index && t.partIndex === 0).length;
      const totalSongs = flat_music_list.filter(t => t.partIndex === 0).length;
      now_playing.textContent = `Playing ${logicalCount} of ${totalSongs}`;
    };

    track_name.textContent = track.name;
    track_name.href = track.url;
    track_artist.textContent = track.artist;
    track_artist.href = track.artistUrl;
    track_art.querySelector('.cover').style.backgroundImage = `url("${track.img}")`;

    updateTimer = setInterval(setUpdate, 1000);
  }

  const setUpdate = () => {
    if (!isNaN(curr_track.duration)) {
      seek_slider.value = (curr_track.currentTime / curr_track.duration) * 100;
      curr_time.textContent = formatTime(curr_track.currentTime);
    }
  };

  // === Controls ===
  const playTrack = () => { curr_track.play(); isPlaying = true; playpause_btn.innerHTML = '<i class="fa fa-pause-circle fa-5x"></i>'; };
  const pauseTrack = () => { curr_track.pause(); isPlaying = false; playpause_btn.innerHTML = '<i class="fa fa-play-circle fa-5x"></i>'; };
  const playpauseTrack = () => (isPlaying ? pauseTrack() : playTrack());
  const seekTo = () => { curr_track.currentTime = (seek_slider.value / 100) * curr_track.duration; };
  const setVolume = () => { curr_track.volume = volume_slider.value / 100; };

  function nextTrack() {
    let next;
    const current = flat_music_list[track_index];
    if (isRandom) next = Math.floor(Math.random() * flat_music_list.length);
    else if (current.isMultiPart && current.partIndex < current.lastPartIndex) next = track_index + 1;
    else {
      next = track_index + 1;
      while(next < flat_music_list.length && flat_music_list[next].originalIndex === current.originalIndex) next++;
    }
    if(next >= flat_music_list.length) next = 0;
    loadTrack(next); playTrack();
  }

  function prevTrack() {
    const current = flat_music_list[track_index];
    let prev = track_index - 1;
    if (current.isMultiPart && current.partIndex > 0) {
      while(prev >= 0 && flat_music_list[prev].originalIndex === current.originalIndex) prev--;
      prev++;
    } else {
      const prevTrackOriginal = flat_music_list[track_index - 1]?.originalIndex;
      while(prev > 0 && flat_music_list[prev - 1].originalIndex === prevTrackOriginal) prev--;
    }
    if(prev < 0) prev = flat_music_list.length - 1;
    loadTrack(prev); playTrack();
  }

  // === Event bindings ===
  playpause_btn.onclick = playpauseTrack;
  next_btn.onclick = nextTrack;
  prev_btn.onclick = prevTrack;
  seek_slider.oninput = seekTo;
  volume_slider.oninput = setVolume;
  curr_track.onended = () => {
    const current = flat_music_list[track_index];
    if(isRepeating){ curr_track.currentTime = 0; playTrack(); }
    else if(current.isMultiPart && current.partIndex < current.lastPartIndex){ loadTrack(track_index + 1); playTrack(); }
    else nextTrack();
  };

  random_btn.onclick = () => { isRandom = !isRandom; random_btn.classList.toggle('active', isRandom); };
  repeat_btn.onclick = () => { isRepeating = !isRepeating; repeat_btn.classList.toggle('active', isRepeating); };

  // === Init first track ===
  if(flat_music_list.length) loadTrack(0);

})();
