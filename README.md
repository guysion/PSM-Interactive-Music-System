# Phrase-to-Scale (PSM) Interactive Music System

The PSM Interactive Music System offers musicians who play monophonic instruments the ability to control the harmonic output of the system by tracking their melodic output.
PSM Interactive Music System Copyright (C) 2020 Guy Sion, University of Oslo

Inquiries: guysionmusic@gmail.com


## REQUIREMENTS

The PSM Interactive Music System is implemented in Cycling '74 Max 8 (Windows 10 64-bit).

The PSM Interactive Music System has been developed and tested on the following platform:
Windows 10 64-bit
MAX 8.1.4 (64-bit)

The following Cycling '74 Max 8 libraries are required:
(download the externals and include these in your Max path)

OMax.Yin+core.maxpat (to be placed in patcher subfolder)
bc.yinstats.mxo (to be placed in externals subfolder)
- OMax https://forum.ircam.fr/projects/detail/omax/
- or from https://github.com/DYCI2/OMax4

yin~.mxe64 or yin~.mxe (to be placed in externals subfolder)
- Max Sound Box https://forum.ircam.fr/projects/detail/max-sound-box/

## INSTRUCTIONS
#### Demo video of the system is available here: https://youtu.be/u-ObVjojjyc

Run the PSM_System.maxpat

**Audio I/O Module:**
Press the speaker icon (ezdac~ object) to turn the audio on.
Choose the type of input from the scroll down menu.
Live Mode to be used for live performance.
Sample Mode to be used for playing audio samples from the playlist module.
Turn Monitor on if you wish to hear yourself in the mix, the note tracker will work regardless.
Adjust microphone input level by using the visual level indicator and the gain dial.

**Pitch detection Module:**
Play a few notes and check if your pitch is being tracked, notes should appear on the staff line and the velocity meter should be moving.
Noise Thresh - Defines a quality factor under which the input signal is rejected from the pitch detection, similar to a noise threshold.
Consistency – Directly related to the estimation quality factor coming from the yin~, meaning, pitches with estimated quality under the value given, will be ignored.
Window (ms) - Defines a time window after which an onset is validated if the estimated pitch remains stable during that time.
Min pitch – set the lowest note of your instrument: Soprano sax-G#2, Alto sax- C#2, Tenor sax-G#1, Baritone sax with low Bb-C#1.
Down sampling – 0=off, 1/2/3=downsampling by 2/4/8. Keep in mind the tradeoff that high downsampling lowers not only the computation cost but also the reliability of the estimation.

**PSM Module:**
Press the capture button and play a phrase in one mode/scale/harmonic environment. Keep in mind that the first note of the phrase should be the tonic/key of the mode/scale you are trying to establish. Try to avoid bending note.
Press the capture button again. The recognized scale and the bass note should appear. You can view the notes that are being captured in the dedicated staff line.

**Drone Module:**
Once a scale has been recognized by the system, press the Drone button to turn it on. Adjust the level with the Gain dial.

**Arpeggiator Module:**
Once a scale has been recognized by the system, press the Arp button to turn it on. Adjust the level with the Gain dial. You can also adjust the speed of the arpeggiator with the Arp Speed Dial.

**Playlist:**
To analyze audio samples of improvised musical phrases, drag the audio files into the playlist object and press play. Keep in mind that the input mode should be set Sample Mode.

**Controller:**
It is possible to use the system with any controller. At the moment the mapping is set as such:  
Capture on/off – yellow key  
Drone on/off – green key  
Arpeggiator on/off – red Key  
Increase Arp speed – D-Pad up key  
Decrease Arp speed – D-Pad down key  
Increase Arp speed step size – D-Pad left key  
Decrease Arp speed step size – D-Pad right key  
