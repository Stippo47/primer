# Sound library: where each candidate came from

Every candidate in `candidates/` is a recording from a public library under **CC0 1.0** (public domain dedication,
https://creativecommons.org/publicdomain/zero/1.0/): free to use in the app, changed or not, with no attribution required.
Credit is given here anyway. Nothing here carries a non-commercial or share-alike clause.

Each was checked on its own page for the CC0 licence when it was fetched. Freesound sounds were taken from the
site's own high-quality preview (cdn.freesound.org, 128 kbps MP3), which needs no sign-in; Kenney packs from kenney.nl.
Then each was cut to its useful moment, high-passed (90 Hz; wind 60, rumble 45: a phone speaker carries little below),
faded at both ends, levelled (effects -27.5 LUFS, taps -28, crack and shatter -25; the crack and shatter lean on a fast
limiter of up to 8 dB to get there) and saved as mono AAC .m4a, 44.1 kHz, 80 kbps.

## In the app

Picked by ear (2026-11-19) and copied unchanged into `sounds/`, where the service worker keeps them for offline
use. `js/feel.js` (`RECORDED`) plays them, one of a kind's files at random, never the same one twice running.
The scenes' own picks (whoosh, cut, swell and the rest) are wired in separately with the animations.

| In `sounds/` | Plays as | Source |
|---|---|---|
| `crack-3-ice.m4a`, `crack-4-ice-short.m4a`, `crack-5-ice-break.m4a` | the combo's crack (a shield taking a miss) | Freesound 177215, 624163, 719973 |
| `shatter-5-tile.m4a` | the combo's shatter (losing it) | Freesound 583310 |
| `tap-2-click.m4a`, `tap-9-switch.m4a`, `tap-10-switch-soft.m4a` | every button press (with Effects on) | Kenney, UI Audio |

## Every candidate

| File | What it is | Source | Author | Original title | Licence |
|---|---|---|---|---|---|
| `whoosh-1-soft-rush.m4a` | Soft even rush of air | [Freesound 683096](https://freesound.org/people/florianreichelt/sounds/683096/) | florianreichelt | Woosh | CC0 1.0 |
| `whoosh-2-low-tail.m4a` | Low whoosh, long fading tail | [Freesound 449992](https://freesound.org/people/DJT4NN3R/sounds/449992/) | DJT4NN3R | whoosh_short_low.wav | CC0 1.0 |
| `whoosh-3-bright-quick.m4a` | Brighter, quicker whoosh | [Freesound 449993](https://freesound.org/people/DJT4NN3R/sounds/449993/) | DJT4NN3R | whoosh_short_high.wav | CC0 1.0 |
| `whoosh-4-fast-swish.m4a` | Classic fast swish | [Freesound 60013](https://freesound.org/people/qubodup/sounds/60013/) | qubodup | Whoosh | CC0 1.0 |
| `whoosh-5-airy-swoosh.m4a` | Airy swoosh | [Freesound 60026](https://freesound.org/people/qubodup/sounds/60026/) | qubodup | Swosh swoosh whoosh air sound, free, high quality | CC0 1.0 |
| `whoosh-6-deep-fade.m4a` | Deep whoosh that fades slowly | [Freesound 351256](https://freesound.org/people/Kinoton/sounds/351256/) | Kinoton | Deep Whoosh #1 | CC0 1.0 |
| `whoosh-7-long-low.m4a` | Long low rush | [Freesound 169867](https://freesound.org/people/Halgrimm/sounds/169867/) | Halgrimm | swoosh | CC0 1.0 |
| `whoosh-8-light-slow.m4a` | Light, slow swoosh | [Freesound 349698](https://freesound.org/people/Mikes-MultiMedia/sounds/349698/) | Mikes-MultiMedia | light slow swoosh.mp3 | CC0 1.0 |
| `whoosh-9-short-punchy.m4a` | Short punchy whoosh | [Freesound 427823](https://freesound.org/people/Kinoton/sounds/427823/) | Kinoton | Whoosh #1 | CC0 1.0 |
| `cut-1-low-puff.m4a` | Low soft puff | [Freesound 432922](https://freesound.org/people/SKsemi/sounds/432922/) | SKsemi | Transition whoosh sound.wav | CC0 1.0 |
| `cut-2-tiny-swish.m4a` | Tiny swish | [Freesound 59988](https://freesound.org/people/qubodup/sounds/59988/) | qubodup | SWOSH-01 44.1kHz | CC0 1.0 |
| `cut-3-quick-swing.m4a` | Quick swing | [Freesound 389590](https://freesound.org/people/Jofae/sounds/389590/) | Jofae | Swing Woosh | CC0 1.0 |
| `cut-4-folder-swish.m4a` | Papery folder swish | [Freesound 704258](https://freesound.org/people/BaggoNotes/sounds/704258/) | BaggoNotes | Folder_Whoosh.wav | CC0 1.0 |
| `cut-5-breathy.m4a` | Breathy short whoosh | [Freesound 789840](https://freesound.org/people/FartCTO/sounds/789840/) | FartCTO | Whoosh Short | CC0 1.0 |
| `cut-6-paper-swipe.m4a` | Paper swiped on a surface | [Freesound 147285](https://freesound.org/people/Frank1100/sounds/147285/) | Frank1100 | fh_Paper_Swipe_Surface2_Short_01.wav | CC0 1.0 |
| `cut-7-dry-rush.m4a` | Dry rush up and away | [Freesound 234535](https://freesound.org/people/Electroviolence/sounds/234535/) | Electroviolence | Dry Transition | CC0 1.0 |
| `cut-8-glassy-reverse.m4a` | Glassy reversed swish | [Freesound 360734](https://freesound.org/people/cabled_mess/sounds/360734/) | cabled_mess | Glassy transition | CC0 1.0 |
| `cut-9-very-quick.m4a` | Very quick woosh | [Freesound 683101](https://freesound.org/people/florianreichelt/sounds/683101/) | florianreichelt | quick woosh | CC0 1.0 |
| `swell-1-cinematic.m4a` | Warm cinematic swell | [Freesound 218524](https://freesound.org/people/jordivburgel/sounds/218524/) | jordivburgel | Movie Swell 2 | CC0 1.0 |
| `swell-2-guitar.m4a` | Guitar swell, tonal | [Freesound 564442](https://freesound.org/people/Fester993/sounds/564442/) | Fester993 | Guitar Swell.wav | CC0 1.0 |
| `swell-3-airy-riser.m4a` | Airy riser | [Freesound 685256](https://freesound.org/people/syntheffects/sounds/685256/) | syntheffects | Riser sound effect short.wav | CC0 1.0 |
| `swell-4-noise-riser.m4a` | Noise riser, stops at the top | [Freesound 840719](https://freesound.org/people/SoundEffectsForAll/sounds/840719/) | SoundEffectsForAll | Simple Riser | CC0 1.0 |
| `swell-5-dense-riser.m4a` | Dense riser | [Freesound 561207](https://freesound.org/people/Rizzard/sounds/561207/) | Rizzard | Riser | CC0 1.0 |
| `swell-6-reverse-cymbal.m4a` | Reversed crash cymbal | [Freesound 674291](https://freesound.org/people/TheEndOfACycle/sounds/674291/) | TheEndOfACycle | Reversed Crash Cymbal | CC0 1.0 |
| `swell-7-shiny-cymbal.m4a` | Short shiny reversed cymbal | [Freesound 774635](https://freesound.org/people/loganzsound/sounds/774635/) | loganzsound | Reverse Cymbal Shiny | CC0 1.0 |
| `swell-8-glassy-cymbal.m4a` | Glassy reversed cymbal | [Freesound 9523](https://freesound.org/people/burnttoys/sounds/9523/) | burnttoys | cymbal-reversed-glassy-resonance.wav | CC0 1.0 |
| `pop-1-round-drip.m4a` | Round pop, like a drip | [Freesound 221091](https://freesound.org/people/AlaskaRobotics/sounds/221091/) | AlaskaRobotics | cartoon pop or drip | CC0 1.0 |
| `pop-2-bubble-bloop.m4a` | Bubble bloop, rising | [Freesound 235264](https://freesound.org/people/Godowan/sounds/235264/) | Godowan | bubble1.wav | CC0 1.0 |
| `pop-3-cartoon-clean.m4a` | Clean cartoon pop | [Freesound 245645](https://freesound.org/people/unfa/sounds/245645/) | unfa | Cartoon Pop (Clean) | CC0 1.0 |
| `pop-4-small-pop.m4a` | Small pop | [Freesound 244655](https://freesound.org/people/D.S.G./sounds/244655/) | D.S.G. | Pop 1 | CC0 1.0 |
| `pop-5-mouth-pop.m4a` | Mouth pop | [Freesound 258269](https://freesound.org/people/jcallison/sounds/258269/) | jcallison | Mouth pop | CC0 1.0 |
| `pop-6-hollow-pop.m4a` | Hollow pop | [Freesound 202230](https://freesound.org/people/deraj/sounds/202230/) | deraj | Pop sound | CC0 1.0 |
| `pop-7-bubble.m4a` | Single bubble | [Freesound 269583](https://freesound.org/people/deleted_user_3854053/sounds/269583/) | deleted_user_3854053 | Bubble | CC0 1.0 |
| `pop-8-tiny-pop.m4a` | Tiny bright pop | [Freesound 401542](https://freesound.org/people/ConarB13/sounds/401542/) | ConarB13 | Pop Sound | CC0 1.0 |
| `pop-9-soft-drop.m4a` | Soft low drop | [Kenney, Interface Sounds](https://kenney.nl/assets/interface-sounds) | Kenney (kenney.nl) | drop_003.ogg | CC0 1.0 |
| `chime-1-two-notes.m4a` | Two quick notes, rising | [Freesound 243701](https://freesound.org/people/ertfelda/sounds/243701/) | ertfelda | correct | CC0 1.0 |
| `chime-2-singing-bowl.m4a` | Singing bowl, struck | [Freesound 271370](https://freesound.org/people/inoshirodesign/sounds/271370/) | inoshirodesign | singing bowl strike sound | CC0 1.0 |
| `chime-3-notification.m4a` | Two soft notification notes | [Freesound 380482](https://freesound.org/people/Jofae/sounds/380482/) | Jofae | Chime Notification | CC0 1.0 |
| `chime-4-chime.m4a` | Chime with a long ring | [Freesound 333629](https://freesound.org/people/jgreer/sounds/333629/) | jgreer | Chime sound | CC0 1.0 |
| `chime-5-bell-ding.m4a` | Bell ding | [Freesound 611113](https://freesound.org/people/5ro4/sounds/611113/) | 5ro4 | bell ding 1.wav | CC0 1.0 |
| `chime-6-little-bell.m4a` | Little bell | [Freesound 360948](https://freesound.org/people/marcusgar/sounds/360948/) | marcusgar | Little bell | CC0 1.0 |
| `chime-7-glockenspiel.m4a` | Glockenspiel flourish | [Freesound 456965](https://freesound.org/people/FunWithSound/sounds/456965/) | FunWithSound | Short Success Sound Glockenspiel Treasure Video Game.mp3 | CC0 1.0 |
| `chime-8-ding.m4a` | Soft high ding | [Freesound 159011](https://freesound.org/people/mrbriandesign/sounds/159011/) | mrbriandesign | ding2.wav | CC0 1.0 |
| `chime-9-major-sixth.m4a` | Two notes a sixth apart | [Freesound 396193](https://freesound.org/people/plasterbrain/sounds/396193/) | plasterbrain | UI Cute Select Major 6th | CC0 1.0 |
| `chime-10-bell-ting.m4a` | Short bell ting | [Freesound 237106](https://freesound.org/people/sqeeeek/sounds/237106/) | sqeeeek | sqeeeek_bell_ting1.wav | CC0 1.0 |
| `wind-1-swelling-gust.m4a` | Gust that swells and dies | [Freesound 555246](https://freesound.org/people/hackerb9/sounds/555246/) | hackerb9 | gust-mono.wav | CC0 1.0 |
| `wind-2-gust.m4a` | Wind gust | [Freesound 146932](https://freesound.org/people/crashoverride6/sounds/146932/) | crashoverride6 | Wind Gust | CC0 1.0 |
| `wind-3-soft-wind.m4a` | Soft steady wind | [Freesound 180328](https://freesound.org/people/Aeonemi/sounds/180328/) | Aeonemi | Soft Wind Blowing.mp3 | CC0 1.0 |
| `wind-4-low-wind.m4a` | Low short wind | [Freesound 104078](https://freesound.org/people/RutgerMuller/sounds/104078/) | RutgerMuller | Wind Low Short.aif | CC0 1.0 |
| `wind-5-howling.m4a` | Howling wind | [Freesound 113176](https://freesound.org/people/Fasolt/sounds/113176/) | Fasolt | wind_howling_04.wav | CC0 1.0 |
| `wind-6-whistling.m4a` | Whistling breath of wind | [Freesound 346237](https://freesound.org/people/helhel/sounds/346237/) | helhel | blowing.wav | CC0 1.0 |
| `fizz-1-soda.m4a` | Soda fizzing in a glass | [Freesound 382634](https://freesound.org/people/kaydinhamby/sounds/382634/) | kaydinhamby | Soda Fizzing.wav | CC0 1.0 |
| `fizz-2-rising-bubbles.m4a` | Bubbles rising, one by one | [Freesound 539819](https://freesound.org/people/ristooooo1/sounds/539819/) | ristooooo1 | Bubbles 004.wav | CC0 1.0 |
| `fizz-3-tablet.m4a` | Tablet dissolving | [Freesound 771957](https://freesound.org/people/harrisonlace/sounds/771957/) | harrisonlace | TABLET DISSOLVE SFX | CC0 1.0 |
| `fizz-4-fizz-crackle.m4a` | Fizz with small crackles | [Freesound 683521](https://freesound.org/people/eqavox/sounds/683521/) | eqavox | Fizz.wav | CC0 1.0 |
| `fizz-5-pouring.m4a` | Fizzy drink being poured | [Freesound 187355](https://freesound.org/people/baidonovan/sounds/187355/) | baidonovan | Pouring Carbonated Beverage Fizz.wav | CC0 1.0 |
| `fizz-6-gentle-bubbles.m4a` | Gentle bubbles with fizz | [Freesound 192495](https://freesound.org/people/murraysortz/sounds/192495/) | murraysortz | Bubbles Gentle With Fizz.wav | CC0 1.0 |
| `fizz-7-bubbling.m4a` | Bubbling, busier | [Freesound 539823](https://freesound.org/people/ristooooo1/sounds/539823/) | ristooooo1 | Bubbles 001.wav | CC0 1.0 |
| `fizz-8-bubble-burst.m4a` | Short burst of bubbles | [Freesound 16738](https://freesound.org/people/kijjaz/sounds/16738/) | kijjaz | bubbles-03.aif | CC0 1.0 |
| `fizz-9-bubbles.m4a` | Bubbles in water | [Freesound 51745](https://freesound.org/people/erkanozan/sounds/51745/) | erkanozan | Bubbles.wav | CC0 1.0 |
| `rumble-1-rolling.m4a` | Rolling thunder | [Freesound 119789](https://freesound.org/people/lmbubec/sounds/119789/) | lmbubec | Rolling Thunder B.wav | CC0 1.0 |
| `rumble-2-steady.m4a` | Steady low rumble | [Freesound 486558](https://freesound.org/people/xUMR/sounds/486558/) | xUMR | thunder.rumble.loop.ogg | CC0 1.0 |
| `rumble-3-distant.m4a` | Distant thunder | [Freesound 581124](https://freesound.org/people/Fission9/sounds/581124/) | Fission9 | Distant Thunder 3 | CC0 1.0 |
| `rumble-4-rolling-far.m4a` | Rolling thunder, farther off | [Freesound 119788](https://freesound.org/people/lmbubec/sounds/119788/) | lmbubec | Rolling Thunder A.wav | CC0 1.0 |
| `rumble-5-soft-thunder.m4a` | Soft thunder rumble | [Freesound 234736](https://freesound.org/people/FenrirFangs/sounds/234736/) | FenrirFangs | thunder rumble 1.wav | CC0 1.0 |
| `rumble-6-thunder-roll.m4a` | Thunder roll, fading | [Freesound 458870](https://freesound.org/people/Raclure/sounds/458870/) | Raclure | Thunder sound | CC0 1.0 |
| `rumble-7-underwater.m4a` | Thunder underwater, very low | [Freesound 151854](https://freesound.org/people/carroll27/sounds/151854/) | carroll27 | Thunder rumbling, underwater, outdoors_Thunder rumbling.aif | CC0 1.0 |
| `rumble-8-storm.m4a` | Storm thunder, bigger | [Freesound 795412](https://freesound.org/people/LukaCafuka/sounds/795412/) | LukaCafuka | Thunder 12 | CC0 1.0 |
| `rumble-9-clap-roll.m4a` | Thunderclap then rumble | [Freesound 475094](https://freesound.org/people/Josh74000MC/sounds/475094/) | Josh74000MC | thunder3.ogg | CC0 1.0 |
| `crack-1-windshield.m4a` | Windshield cracking, spreading | [Freesound 806423](https://freesound.org/people/Sanderboah/sounds/806423/) | Sanderboah | Car windshield crack | CC0 1.0 |
| `crack-2-glass-pane.m4a` | Glass pane cracking | [Freesound 377813](https://freesound.org/people/13GPanska_Cihala_Vilem/sounds/377813/) | 13GPanska_Cihala_Vilem | prasknutí skla.wav | CC0 1.0 |
| `crack-3-ice.m4a` | Ice cracking | [Freesound 177215](https://freesound.org/people/ecfike/sounds/177215/) | ecfike | Ice Crack 7.wav | CC0 1.0 |
| `crack-4-ice-short.m4a` | Ice cracking, short | [Freesound 624163](https://freesound.org/people/wwstudioswastaken/sounds/624163/) | wwstudioswastaken | ice_cracking_01.flac | CC0 1.0 |
| `crack-5-ice-break.m4a` | Ice breaking | [Freesound 719973](https://freesound.org/people/InMotionAudio/sounds/719973/) | InMotionAudio | ICEBrk_Break04_InMotionAudio_FREESampleSunday | CC0 1.0 |
| `crack-6-ice-bending.m4a` | Ice bending and creaking | [Freesound 621138](https://freesound.org/people/wwstudioswastaken/sounds/621138/) | wwstudioswastaken | Ice_Bending_01.flac | CC0 1.0 |
| `crack-7-snap.m4a` | Sharp crack | [Freesound 348929](https://freesound.org/people/abstraktgeneriert/sounds/348929/) | abstraktgeneriert | Crack #1.wav | CC0 1.0 |
| `crack-8-eggshell.m4a` | Eggshell cracking, crunchy | [Freesound 336613](https://freesound.org/people/Anthousai/sounds/336613/) | Anthousai | egg - crack 01.wav | CC0 1.0 |
| `crack-9-wood.m4a` | Wood cracking (not glass) | [Freesound 183450](https://freesound.org/people/utsuru/sounds/183450/) | utsuru | Wood Crack 5 | CC0 1.0 |
| `shatter-1-dish.m4a` | Ceramic dish breaking | [Freesound 128258](https://freesound.org/people/rebeat/sounds/128258/) | rebeat | Breaking Dish_1.aif | CC0 1.0 |
| `shatter-2-glass-hard.m4a` | Glass smashed hard | [Freesound 861043](https://freesound.org/people/ElevatorFan2020/sounds/861043/) | ElevatorFan2020 | Hard Glass Break 2 | CC0 1.0 |
| `shatter-3-dish-small.m4a` | Smaller dish breaking | [Freesound 128257](https://freesound.org/people/rebeat/sounds/128257/) | rebeat | Breaking Dish_2.aif | CC0 1.0 |
| `shatter-4-big-dish.m4a` | Big dish breaking | [Freesound 128259](https://freesound.org/people/rebeat/sounds/128259/) | rebeat | Breaking Big Dish.aif | CC0 1.0 |
| `shatter-5-tile.m4a` | Tile breaking | [Freesound 583310](https://freesound.org/people/Fission9/sounds/583310/) | Fission9 | Tile Breaking | CC0 1.0 |
| `shatter-6-bottle.m4a` | Bottle shattering | [Freesound 202093](https://freesound.org/people/spookymodem/sounds/202093/) | spookymodem | Bottle Shattering.wav | CC0 1.0 |
| `shatter-7-glass-smash.m4a` | Glass smashing, longer spill | [Freesound 244238](https://freesound.org/people/chewiesmissus/sounds/244238/) | chewiesmissus | Glass Smash.wav | CC0 1.0 |
| `shatter-8-glass.m4a` | Breaking glass | [Freesound 267889](https://freesound.org/people/wjl/sounds/267889/) | wjl | Breaking-Glass.wav | CC0 1.0 |
| `shatter-9-glass-bright.m4a` | Breaking glass, brighter | [Freesound 233607](https://freesound.org/people/abstraktgeneriert/sounds/233607/) | abstraktgeneriert | Breaking Glass #1.wav | CC0 1.0 |
| `shatter-10-glass-short.m4a` | Glass break, short | [Freesound 221528](https://freesound.org/people/unfa/sounds/221528/) | unfa | Glass Break | CC0 1.0 |
| `tap-1-ui-click.m4a` | Plain button click | [Freesound 467951](https://freesound.org/people/benzix2/sounds/467951/) | benzix2 | UI Button Click | CC0 1.0 |
| `tap-2-click.m4a` | Small plastic click | [Kenney, UI Audio](https://kenney.nl/assets/ui-audio) | Kenney (kenney.nl) | click1.ogg | CC0 1.0 |
| `tap-3-soft-tap.m4a` | Soft tap | [Freesound 138476](https://freesound.org/people/JustInvoke/sounds/138476/) | JustInvoke | Step/Tap | CC0 1.0 |
| `tap-4-low-thump.m4a` | Low soft thump | [Freesound 146718](https://freesound.org/people/Leszek_Szary/sounds/146718/) | Leszek_Szary | button | CC0 1.0 |
| `tap-5-wood.m4a` | Light knock on wood | [Kenney, Impact Sounds](https://kenney.nl/assets/impact-sounds) | Kenney (kenney.nl) | impactWood_light_000.ogg | CC0 1.0 |
| `tap-6-key.m4a` | Keyboard key, down and up | [Freesound 180997](https://freesound.org/people/uEffects/sounds/180997/) | uEffects | enter key | CC0 1.0 |
| `tap-7-menu-click.m4a` | Click with a tiny ring | [Freesound 171697](https://freesound.org/people/NenadSimic/sounds/171697/) | NenadSimic | Menu Selection Click | CC0 1.0 |
| `tap-8-glass-tap.m4a` | Tap on glass | [Freesound 262958](https://freesound.org/people/Unicornaphobist/sounds/262958/) | Unicornaphobist | Glass Tap.wav | CC0 1.0 |
| `tap-9-switch.m4a` | Switch flicked | [Kenney, UI Audio](https://kenney.nl/assets/ui-audio) | Kenney (kenney.nl) | switch2.ogg | CC0 1.0 |
| `tap-10-switch-soft.m4a` | Softer switch | [Kenney, UI Audio](https://kenney.nl/assets/ui-audio) | Kenney (kenney.nl) | switch7.ogg | CC0 1.0 |

Licence texts: Freesound shows "Creative Commons 0" on each sound page; each Kenney pack ships a License.txt saying
"License (Creative Commons Zero, CC0) ... You may use these assets in personal and commercial projects."
