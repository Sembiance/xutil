"use strict";

const XU = require("@sembiance/xu"),
	path = require("path"),
	tiptoe = require("tiptoe"),
	assert = require("assert"),
	fs = require("fs"),
	fileUtil = require("../index").file,
	hashUtil = require("../index").hash,
	archiveUtil = require("../index").archive;

const FILES_DIR = path.join(__dirname, "files");
const OUTPUT_DIR = fileUtil.generateTempFilePath("/mnt/ram/tmp");

/* eslint-disable comma-spacing, max-len */
const TEST_PARAMS =
{
	adfFFS      : {archiveFile : "darknews12.adf", hash : {filename : "DARKNEWS #12/MENU", sum : "9e02a3648b265d03fb35461260c26e62"}, filenames : ["DARKNEWS #12.blkdev","DARKNEWS #12.bootcode","DARKNEWS #12.xdfmeta","DARKNEWS #12/c/border","DARKNEWS #12/c/loader","DARKNEWS #12/c/run","DARKNEWS #12/c/txt","DARKNEWS #12/devs/system-configuration","DARKNEWS #12/DKS1","DARKNEWS #12/DKS2","DARKNEWS #12/DKS3","DARKNEWS #12/DKS4","DARKNEWS #12/DKS5","DARKNEWS #12/GEVALIA.info","DARKNEWS #12/MENU","DARKNEWS #12/s/startup-sequence"]},
	adfOFS      : {archiveFile : "AegisSonix1.3.adf", hash : {filename : "Aegis-Sonixix 1.2/Instruments/TFI-001.-=>PB.instr", sum : "2cf6731680a67f1157e503f93e6d2fb3"}, filenames :  ["Aegis-Sonixix 1.2/.info","Aegis-Sonixix 1.2/c/Date","Aegis-Sonixix 1.2/c/Delete","Aegis-Sonixix 1.2/c/Dir","Aegis-Sonixix 1.2/c/echo","Aegis-Sonixix 1.2/c/EndCLI","Aegis-Sonixix 1.2/c/Format","Aegis-Sonixix 1.2/c/Info","Aegis-Sonixix 1.2/c/Install","Aegis-Sonixix 1.2/c/List","Aegis-Sonixix 1.2/c/LoadWB","Aegis-Sonixix 1.2/c/Makedir","Aegis-Sonixix 1.2/c/NewCLI","Aegis-Sonixix 1.2/c/Type","Aegis-Sonixix 1.2/c/WorkBench","Aegis-Sonixix 1.2/CLI","Aegis-Sonixix 1.2/d/ak","Aegis-Sonixix 1.2/d/bs.asm","Aegis-Sonixix 1.2/d/bs.do","Aegis-Sonixix 1.2/d/ck","Aegis-Sonixix 1.2/d/iff","Aegis-Sonixix 1.2/d/IFFCheck","Aegis-Sonixix 1.2/d/mk","Aegis-Sonixix 1.2/d/mp","Aegis-Sonixix 1.2/d/mt","Aegis-Sonixix 1.2/d/sleep","Aegis-Sonixix 1.2/d/sleep.asm","Aegis-Sonixix 1.2/d/sleep.do","Aegis-Sonixix 1.2/d/sst","Aegis-Sonixix 1.2/d/st","Aegis-Sonixix 1.2/d/sx","Aegis-Sonixix 1.2/d/sx.asm","Aegis-Sonixix 1.2/d/sx.do","Aegis-Sonixix 1.2/d/tp.asm","Aegis-Sonixix 1.2/d/tp.do","Aegis-Sonixix 1.2/d/wb","Aegis-Sonixix 1.2/devs/serial.device","Aegis-Sonixix 1.2/devs/system-configuration","Aegis-Sonixix 1.2/Disk.info","Aegis-Sonixix 1.2/Instruments/1.instr","Aegis-Sonixix 1.2/Instruments/12.21.85.instr","Aegis-Sonixix 1.2/Instruments/2.instr","Aegis-Sonixix 1.2/Instruments/AcousticGuitar.instr","Aegis-Sonixix 1.2/Instruments/AcousticGuitar.ss","Aegis-Sonixix 1.2/Instruments/Ardrey.instr","Aegis-Sonixix 1.2/Instruments/Ardrey2.instr","Aegis-Sonixix 1.2/Instruments/Atlantis.instr","Aegis-Sonixix 1.2/Instruments/Banjo.ss","Aegis-Sonixix 1.2/Instruments/Bass1.instr","Aegis-Sonixix 1.2/Instruments/BassDrum.instr","Aegis-Sonixix 1.2/Instruments/Bassdrum.ss","Aegis-Sonixix 1.2/Instruments/BassGuitar.instr","Aegis-Sonixix 1.2/Instruments/BassGuitar.ss","Aegis-Sonixix 1.2/Instruments/bella.instr","Aegis-Sonixix 1.2/Instruments/Bells.instr","Aegis-Sonixix 1.2/Instruments/BowBowBow.instr","Aegis-Sonixix 1.2/Instruments/Cello.instr","Aegis-Sonixix 1.2/Instruments/Clarinet.ss","Aegis-Sonixix 1.2/Instruments/Claves.instr","Aegis-Sonixix 1.2/Instruments/Claves.ss","Aegis-Sonixix 1.2/Instruments/Clavinet.instr","Aegis-Sonixix 1.2/Instruments/Cymbal.instr","Aegis-Sonixix 1.2/Instruments/Cymbal.ss","Aegis-Sonixix 1.2/Instruments/Default.instr","Aegis-Sonixix 1.2/Instruments/DELAY1.instr","Aegis-Sonixix 1.2/Instruments/DistortedGuitar.instr","Aegis-Sonixix 1.2/Instruments/DistortedGuitar.ss","Aegis-Sonixix 1.2/Instruments/Dreamy1.instr","Aegis-Sonixix 1.2/Instruments/Dreamy2.instr","Aegis-Sonixix 1.2/Instruments/DX7-001.-=>PB.instr","Aegis-Sonixix 1.2/Instruments/Echo1.instr","Aegis-Sonixix 1.2/Instruments/Echo2.instr","Aegis-Sonixix 1.2/Instruments/Echo3.instr","Aegis-Sonixix 1.2/Instruments/EchoBells.instr","Aegis-Sonixix 1.2/Instruments/ElectricPiano1.instr","Aegis-Sonixix 1.2/Instruments/ElectricPiano2.instr","Aegis-Sonixix 1.2/Instruments/EnsoniqSnare1.instr","Aegis-Sonixix 1.2/Instruments/EnsoniqSnare2.instr","Aegis-Sonixix 1.2/Instruments/Flute.instr","Aegis-Sonixix 1.2/Instruments/Flute.ss","Aegis-Sonixix 1.2/Instruments/FORM.tech","Aegis-Sonixix 1.2/Instruments/Funny1.instr","Aegis-Sonixix 1.2/Instruments/Funny2.instr","Aegis-Sonixix 1.2/Instruments/Funny3.instr","Aegis-Sonixix 1.2/Instruments/Harpsichord1.instr","Aegis-Sonixix 1.2/Instruments/Harpsichord2.Instr","Aegis-Sonixix 1.2/Instruments/HeavyMetal.instr","Aegis-Sonixix 1.2/Instruments/HeavyMetal.ss","Aegis-Sonixix 1.2/Instruments/HighHat.instr","Aegis-Sonixix 1.2/Instruments/IceBells.instr","Aegis-Sonixix 1.2/Instruments/IceBells2.instr","Aegis-Sonixix 1.2/Instruments/IFF Electric Bass.instr","Aegis-Sonixix 1.2/Instruments/IFF Electric Piano.instr","Aegis-Sonixix 1.2/Instruments/IFF Saxophone.instr","Aegis-Sonixix 1.2/Instruments/IFF Vibes.instr","Aegis-Sonixix 1.2/Instruments/Koto1.instr","Aegis-Sonixix 1.2/Instruments/Koto3.instr","Aegis-Sonixix 1.2/Instruments/Marimba.instr","Aegis-Sonixix 1.2/Instruments/Metal1.instr","Aegis-Sonixix 1.2/Instruments/Metal2.instr","Aegis-Sonixix 1.2/Instruments/MIDI.tech","Aegis-Sonixix 1.2/Instruments/MIDIPatch.instr","Aegis-Sonixix 1.2/Instruments/MisterGONE.-=>PB.instr","Aegis-Sonixix 1.2/Instruments/Orchestra.instr","Aegis-Sonixix 1.2/Instruments/Organ1.instr","Aegis-Sonixix 1.2/Instruments/Organ2.instr","Aegis-Sonixix 1.2/Instruments/Organ3.instr","Aegis-Sonixix 1.2/Instruments/Organ5.instr","Aegis-Sonixix 1.2/Instruments/PipeOrgan.instr","Aegis-Sonixix 1.2/Instruments/PipeOrgan.ss","Aegis-Sonixix 1.2/Instruments/Reed.instr","Aegis-Sonixix 1.2/Instruments/ReverbBells.instr","Aegis-Sonixix 1.2/Instruments/SampledSound.tech","Aegis-Sonixix 1.2/Instruments/sandy.instr","Aegis-Sonixix 1.2/Instruments/Saxophone.instr","Aegis-Sonixix 1.2/Instruments/Saxophone.ss","Aegis-Sonixix 1.2/Instruments/SNARE2.instr","Aegis-Sonixix 1.2/Instruments/SnareDrum.instr","Aegis-Sonixix 1.2/Instruments/SnareDrum.ss","Aegis-Sonixix 1.2/Instruments/SpaceVibes.instr","Aegis-Sonixix 1.2/Instruments/Strings.instr","Aegis-Sonixix 1.2/Instruments/Strings.ss","Aegis-Sonixix 1.2/Instruments/Synth1.instr","Aegis-Sonixix 1.2/Instruments/Synth2.instr","Aegis-Sonixix 1.2/Instruments/SynthBanjo.instr","Aegis-Sonixix 1.2/Instruments/SynthBass1.instr","Aegis-Sonixix 1.2/Instruments/SynthBells.instr","Aegis-Sonixix 1.2/Instruments/Synthesis.tech","Aegis-Sonixix 1.2/Instruments/TFI-001.-=>PB.instr","Aegis-Sonixix 1.2/Instruments/Tibet1.instr","Aegis-Sonixix 1.2/Instruments/TomDrum.instr","Aegis-Sonixix 1.2/Instruments/TomDrum.ss","Aegis-Sonixix 1.2/Instruments/Tomita.instr","Aegis-Sonixix 1.2/Instruments/Trumpet.instr","Aegis-Sonixix 1.2/Instruments/Trumpet.ss","Aegis-Sonixix 1.2/Instruments/Trumpet2.instr","Aegis-Sonixix 1.2/Instruments/Tuba.instr","Aegis-Sonixix 1.2/Instruments/Vibes.ss","Aegis-Sonixix 1.2/Instruments/Violin.instr","Aegis-Sonixix 1.2/libs/icon.library","Aegis-Sonixix 1.2/libs/info.library","Aegis-Sonixix 1.2/Miscellaneous/AmigaKeyboard.code","Aegis-Sonixix 1.2/Miscellaneous/Bootstrap","Aegis-Sonixix 1.2/Miscellaneous/ColortoneKeyboard.code","Aegis-Sonixix 1.2/Miscellaneous/Keyboard.code","Aegis-Sonixix 1.2/Miscellaneous/MIDIKeyboard.code","Aegis-Sonixix 1.2/Miscellaneous/Sonix.code","Aegis-Sonixix 1.2/Miscellaneous/TypeMe","Aegis-Sonixix 1.2/s/startup-sequence","Aegis-Sonixix 1.2/Scores/A View to a Kill.smus","Aegis-Sonixix 1.2/Scores/Abby Road.smus","Aegis-Sonixix 1.2/Scores/Angels Heard on High.smus","Aegis-Sonixix 1.2/Scores/Axel F.smus","Aegis-Sonixix 1.2/Scores/Clam City.smus","Aegis-Sonixix 1.2/Scores/Ghost Busters.smus","Aegis-Sonixix 1.2/Scores/hansel.smus","Aegis-Sonixix 1.2/Scores/Miami Vice.smus","Aegis-Sonixix 1.2/Scores/michi2.smus","Aegis-Sonixix 1.2/Scores/Sonix.smusmus","Aegis-Sonixix 1.2/Scores/Spanish Flea.smus","Aegis-Sonixix 1.2/Scores/YBTTC2.smus","Aegis-Sonixix 1.2/Scores/You Belong to the City.smus","Aegis-Sonixix 1.2/Sonix","Aegis-Sonixix 1.2/Sonix.info","Aegis-Sonixix 1.2/t/ed-backupequence","Aegis-Sonixix 1.2/thewizards"]},
	amos        : {archiveFile : "recuento.amos", hash : {filename : "pic0E.iff", sum : "e3bbddc21e230a3cf744b2357278cbad"}, filenames : ["bank0E.abk","bank0F.abk","bank10.abk","bank11.abk","bank12.abk","pic0E.iff","pic0F.iff","pic10.iff","pic12.iff","recuento.amos_sourceCode","sample01.doble_.8svx","sample02.an____.8svx"]},
	arc         : {archiveFile : "CHRISTIE.ARC", filenames : ["CHRISTIE.MAC","READMAC.EXE"], hash : {filename : "CHRISTIE.MAC", sum : "653620bafbbf434714bb8bbcb2563499"}},
	arj         : {archiveFile : "#1GALAXY.EXE", filenames : ["audio.ck4","catalog.exe","egagraph.ck4","gamemaps.ck4","keen4e.exe","order.frm","readme.doc"], hash : {filename : "gamemaps.ck4", sum : "9e1811deb429f7edc6bffa5bb786ebb4"}},
	bz2         : {archiveFile : "sm.tar.bz2", filenames : ["sm.tar"], hash : {filename : "sm.tar", sum : "755d39f68c1d4a6323881bc6f0a30eac"}},
	compactPro  : {archiveFile : "GFCNVRTR.CPT", hash : {filename : "GIFConverter 2.2 Notes", sum : "770cba0d543494d9339b2cb151a5402f"}, filenames : ["GIFConverter 2.0d5 to 2.1.1 not","GIFConverter 2.0d5 to 2.1.1 not.rsrc","GIFConverter 2.2 Notes","GIFConverter 2.2.9.rsrc"]},
	crunchMania : {archiveFile : "13.bmp.crm2", filenames : ["13.bmp"], hash : {filename : "13.bmp", sum : "3c68887429da3a418f55df13b941cc55"}},
	director    : {archiveFile : "Glossary.drx", hash : {filename : "1/data.json", sum : "48d731a07746d4089f09e6f44023b64c"}},
	dms         : {archiveFile : "voyager.dms", filenames : ["voyager.adf"], hash : {filename : "voyager.adf", sum : "80562ebeff7cc970c7e7ec8bb6c69767"}},
	gxlib       : {archiveFile : "KLONDIKE.GX", hash : {filename : "DECK.PCX", sum : "4eb42228ef416de1b3f732669436f9c9"}, filenames : ["DECK.PCX", "INTRO.PCX"]},
	gz          : {archiveFile : "sm.tar.gz", filenames : ["sm.tar"], hash : {filename : "sm.tar", sum : "755d39f68c1d4a6323881bc6f0a30eac"}},
	hypercard   : {archiveFile : "hypercardStack", hash : {filename : "BMAP_12600.pbm", sum : "be4d61d8386c58d3fb368ed6e59c1334"}, filenames : ["background_2796.xml","BKGD_2796.data","BMAP_10633.pbm","BMAP_10773.pbm","BMAP_11530.pbm","BMAP_12219.pbm","BMAP_12407.pbm","BMAP_12600.pbm","BMAP_13240.pbm","BMAP_14604.pbm","BMAP_15343.pbm","BMAP_15575.pbm","BMAP_16586.pbm","BMAP_3637.pbm","BMAP_4309.pbm","BMAP_5013.pbm","BMAP_5162.pbm","BMAP_5713.pbm","BMAP_6216.pbm","BMAP_7130.pbm","BMAP_7634.pbm","BMAP_7865.pbm","BMAP_8366.pbm","BMAP_8951.pbm","BMAP_9581.pbm","BMAP_9877.pbm","CARD_10419.data","card_10419.xml","CARD_11037.data","card_11037.xml","CARD_11336.data","card_11336.xml","CARD_11888.data","card_11888.xml","CARD_12986.data","card_12986.xml","CARD_13589.data","card_13589.xml","CARD_14228.data","card_14228.xml","CARD_14504.data","card_14504.xml","CARD_15030.data","card_15030.xml","CARD_16349.data","card_16349.xml","CARD_2816.data","card_2816.xml","CARD_3923.data","card_3923.xml","CARD_4598.data","card_4598.xml","CARD_4689.data","card_4689.xml","CARD_5471.data","card_5471.xml","CARD_5994.data","card_5994.xml","CARD_6453.data","card_6453.xml","CARD_6771.data","card_6771.xml","CARD_7196.data","card_7196.xml","CARD_8174.data","card_8174.xml","CARD_8472.data","card_8472.xml","CARD_8988.data","card_8988.xml","CARD_9364.data","card_9364.xml","CARD_9987.data","card_9987.xml","LIST_2295.data","PAGE_2464.data","PAT_1.pbm","PAT_10.pbm","PAT_11.pbm","PAT_12.pbm","PAT_13.pbm","PAT_14.pbm","PAT_15.pbm","PAT_16.pbm","PAT_17.pbm","PAT_18.pbm","PAT_19.pbm","PAT_2.pbm","PAT_20.pbm","PAT_21.pbm","PAT_22.pbm","PAT_23.pbm","PAT_24.pbm","PAT_25.pbm","PAT_26.pbm","PAT_27.pbm","PAT_28.pbm","PAT_29.pbm","PAT_3.pbm","PAT_30.pbm","PAT_31.pbm","PAT_32.pbm","PAT_33.pbm","PAT_34.pbm","PAT_35.pbm","PAT_36.pbm","PAT_37.pbm","PAT_38.pbm","PAT_39.pbm","PAT_4.pbm","PAT_40.pbm","PAT_5.pbm","PAT_6.pbm","PAT_7.pbm","PAT_8.pbm","PAT_9.pbm","project.xml","stack_-1.xml","STAK_-1.data","STBL_3162.data","stylesheet_3162.css"]},
	iso         : {archiveFile : "test.iso", filenames : ["autorun.inf","INET.exe","README.txt"], hash : {filename : "INET.exe", sum : "fcd64a8ff61ae4fd07fc7b8d3646b6e2"}},
	lha         : {archiveFile : "hexify.lha", filenames : ["hexify/hexify.c","hexify/hexify.h","hexify/hexify.readme","hexify/LICENSE","hexify/Makefile","hexify/sample","hexify/sample.c"], hash : {filename : "hexify/Makefile", sum : "35f2105b032f4668b1d284e0404cb076"}},
	lzx         : {archiveFile : "xpk_compress.lzx", hash : {filename : "xpkRAKE.library", sum : "8e14dd77450c4169721b6a87f4dcd747"}, filenames : ["xpkBLZW.library","xpkCBR0.library","xpkCRM2.library","xpkCRMS.library","xpkDHUF.library","xpkDLTA.library","xpkENCO.library","xpkFAST.library","xpkFEAL.library","xpkHFMN.library","xpkHUFF.library","xpkIDEA.library","xpkIMPL.library","xpkLHLB.library","xpkMASH.library","xpkNONE.library","xpkNUKE.library","xpkPWPK.library","xpkRAKE.library","xpkRDCN.library","xpkRLEN.library","xpkSHRI.library","xpkSMPL.library","xpkSQSH.library"]},
	mbox        : {archiveFile : "test.mbox", filenames : ["000000_nobody_Thu Jan 30 16:51:19 2014.msg","000001_nobody_Thu Jan 30 16:51:20 2014.msg","000002_nobody_Thu Jan 30 16:51:20 2014.msg","000003_nobody_Thu Jan 30 16:51:20 2014.msg","000004_nobody_Thu Jan 30 16:51:20 2014.msg","000005_nobody_Thu Jan 30 16:51:20 2014.msg","000006_nobody_Thu Jan 30 16:51:20 2014.msg","000007_nobody_Thu Jan 30 16:51:20 2014.msg","000008_nobody_Thu Jan 30 16:51:20 2014.msg","000009_nobody_Thu Jan 30 16:51:21 2014.msg","000010_nobody_Thu Jan 30 16:51:21 2014.msg","000011_nobody_Thu Jan 30 16:51:22 2014.msg","000012_nobody_Thu Jan 30 16:51:22 2014.msg","000013_nobody_Thu Jan 30 16:51:23 2014.msg","000014_nobody_Thu Jan 30 16:51:23 2014.msg","000015_nobody_Thu Jan 30 16:51:23 2014.msg","000016_nobody_Thu Jan 30 16:51:24 2014.msg","000017_nobody_Thu Jan 30 16:51:24 2014.msg","000018_nobody_Thu Jan 30 16:51:24 2014.msg","000019_nobody_Thu Jan 30 16:51:24 2014.msg","000020_nobody_Thu Jan 30 16:51:24 2014.msg","000021_nobody_Thu Jan 30 16:51:24 2014.msg","000022_nobody_Thu Jan 30 16:51:24 2014.msg","000023_nobody_Thu Jan 30 16:51:24 2014.msg"], hash : {filename : "000021_nobody_Thu Jan 30 16:51:24 2014.msg", sum : "ae717673e9b0c556d2cc1c709fde33b0"}},
	msCompress  : {archiveFile : "REGISTER.TXT", filenames : ["REGISTER.TXT"], hash : {filename : "REGISTER.TXT", sum : "108b8cd039bac2bccf045c3cb582cfa2"}},
	pcxlib      : {archiveFile : "POKER.PCL", filenames : ["ASP.PCC", "CARDS.PCC", "DECK.PCX", "EMLOGO.PCC", "POKER.PCC", "WELCOME.PCC"], hash : {filename : "CARDS.PCC", sum : "386ef6988fd2bc620dfa186463b76b72"}},
	pog         : {archiveFile : "graphic5.pog", hash : {filename : "graphic5.233.png", sum : "da0d4a779cddfd543f4584e326641b5d"}, filenames : ["graphic5.000.png","graphic5.001.png","graphic5.002.png","graphic5.003.png","graphic5.004.png","graphic5.005.png","graphic5.006.png","graphic5.007.png","graphic5.008.png","graphic5.009.png","graphic5.010.png","graphic5.011.png","graphic5.012.png","graphic5.013.png","graphic5.014.png","graphic5.015.png","graphic5.016.png","graphic5.017.png","graphic5.018.png","graphic5.019.png","graphic5.020.png","graphic5.021.png","graphic5.022.png","graphic5.023.png","graphic5.024.png","graphic5.025.png","graphic5.026.png","graphic5.027.png","graphic5.028.png","graphic5.029.png","graphic5.030.png","graphic5.031.png","graphic5.032.png","graphic5.033.png","graphic5.034.png","graphic5.035.png","graphic5.036.png","graphic5.037.png","graphic5.038.png","graphic5.039.png","graphic5.040.png","graphic5.041.png","graphic5.042.png","graphic5.043.png","graphic5.044.png","graphic5.045.png","graphic5.046.png","graphic5.047.png","graphic5.048.png","graphic5.049.png","graphic5.050.png","graphic5.051.png","graphic5.052.png","graphic5.053.png","graphic5.054.png","graphic5.055.png","graphic5.056.png","graphic5.057.png","graphic5.058.png","graphic5.059.png","graphic5.060.png","graphic5.061.png","graphic5.062.png","graphic5.063.png","graphic5.064.png","graphic5.065.png","graphic5.066.png","graphic5.067.png","graphic5.068.png","graphic5.069.png","graphic5.070.png","graphic5.071.png","graphic5.072.png","graphic5.073.png","graphic5.074.png","graphic5.075.png","graphic5.076.png","graphic5.077.png","graphic5.078.png","graphic5.079.png","graphic5.080.png","graphic5.081.png","graphic5.082.png","graphic5.083.png","graphic5.084.png","graphic5.085.png","graphic5.086.png","graphic5.087.png","graphic5.088.png","graphic5.089.png","graphic5.090.png","graphic5.091.png","graphic5.092.png","graphic5.093.png","graphic5.094.png","graphic5.095.png","graphic5.096.png","graphic5.097.png","graphic5.098.png","graphic5.099.png","graphic5.100.png","graphic5.101.png","graphic5.102.png","graphic5.103.png","graphic5.104.png","graphic5.105.png","graphic5.106.png","graphic5.107.png","graphic5.108.png","graphic5.109.png","graphic5.110.png","graphic5.111.png","graphic5.112.png","graphic5.113.png","graphic5.114.png","graphic5.115.png","graphic5.116.png","graphic5.117.png","graphic5.118.png","graphic5.119.png","graphic5.120.png","graphic5.121.png","graphic5.122.png","graphic5.123.png","graphic5.124.png","graphic5.125.png","graphic5.126.png","graphic5.127.png","graphic5.128.png","graphic5.129.png","graphic5.130.png","graphic5.131.png","graphic5.132.png","graphic5.133.png","graphic5.134.png","graphic5.135.png","graphic5.136.png","graphic5.137.png","graphic5.138.png","graphic5.139.png","graphic5.140.png","graphic5.141.png","graphic5.142.png","graphic5.143.png","graphic5.144.png","graphic5.145.png","graphic5.146.png","graphic5.147.png","graphic5.148.png","graphic5.149.png","graphic5.150.png","graphic5.151.png","graphic5.152.png","graphic5.153.png","graphic5.154.png","graphic5.155.png","graphic5.156.png","graphic5.157.png","graphic5.158.png","graphic5.159.png","graphic5.160.png","graphic5.161.png","graphic5.162.png","graphic5.163.png","graphic5.164.png","graphic5.165.png","graphic5.166.png","graphic5.167.png","graphic5.168.png","graphic5.169.png","graphic5.170.png","graphic5.171.png","graphic5.172.png","graphic5.173.png","graphic5.174.png","graphic5.175.png","graphic5.176.png","graphic5.177.png","graphic5.178.png","graphic5.179.png","graphic5.180.png","graphic5.181.png","graphic5.182.png","graphic5.183.png","graphic5.184.png","graphic5.185.png","graphic5.186.png","graphic5.187.png","graphic5.188.png","graphic5.189.png","graphic5.190.png","graphic5.191.png","graphic5.192.png","graphic5.193.png","graphic5.194.png","graphic5.195.png","graphic5.196.png","graphic5.197.png","graphic5.198.png","graphic5.199.png","graphic5.200.png","graphic5.201.png","graphic5.202.png","graphic5.203.png","graphic5.204.png","graphic5.205.png","graphic5.206.png","graphic5.207.png","graphic5.208.png","graphic5.209.png","graphic5.210.png","graphic5.211.png","graphic5.212.png","graphic5.213.png","graphic5.214.png","graphic5.215.png","graphic5.216.png","graphic5.217.png","graphic5.218.png","graphic5.219.png","graphic5.220.png","graphic5.221.png","graphic5.222.png","graphic5.223.png","graphic5.224.png","graphic5.225.png","graphic5.226.png","graphic5.227.png","graphic5.228.png","graphic5.229.png","graphic5.230.png","graphic5.231.png","graphic5.232.png","graphic5.233.png","graphic5.234.png"]},
	powerPack   : {archiveFile : "hotachy1.anim.pp", filenames : ["hotachy1.anim"], hash : {filename : "hotachy1.anim", sum : "effe736a9641b42f50e5a4b865687f56"}},
	rar         : {archiveFile : "cheats.rar", filenames : ["BLOOD3D.RAR", "CHEATS-T.RAR", "MAGIC-G.RAR", "MDKTRAIN.RAR"], hash : {filename : "MDKTRAIN.RAR", sum : "000352ddf886ef7ded10ac1f366f1956"}},
	rnc			: {archiveFile : "test.rnc", filenames : ["test"], hash : {filename : "test", "sum" : "f74bef743d591d21bf78fdefaa902aef"}},
	rsrc        : {archiveFile : "blackfor.rsrc", filenames : ["blackfor.000.icns"], hash : {filename : "blackfor.000.icns", sum : "1120f28a9ed0657c83263583f86825a0"}},
	sit         : {archiveFile : "blackfor.sit", filenames : ["BlackForest ƒ/BlackFor.rsrc","BlackForest ƒ/BlackForest.AFM","BlackForest ƒ/BlackForest.bmap.rsrc","BlackForest ƒ/Read Me First!!"], hash : {filename : "BlackForest ƒ/BlackFor.rsrc", sum : "4fee556ca486335cf9d0ea5c1165ff73"}},
	stc         : {archiveFile : "MA2", filenames : ["MA2"], hash : {filename : "MA2", sum : "446f663a8882fc10f19fcf75a9b3dd1f"}},
	tar         : {archiveFile : "sm.tar", filenames : ["sm-if09.jpg"], hash : {filename : "sm-if09.jpg", sum : "c5dd377dec72d6790737ad5209a73017"}},
	tscomp      : {archiveFile : "TWOFILES.TSC", filenames : ["A.TXT", "B.TXT"], hash : {filename : "B.TXT", sum : "fb59fc0592398f60b5d05299b2bb976f"}},
	ttcomp      : {archiveFile : "quickgif.__d", filenames : ["quickgif"], hash : {filename : "quickgif", sum : "0a34340a86c6a437bb6b7207b48b735a"}},
	xpk         : {archiveFile : "mod.chiquitomix.xpk", filenames : ["mod.chiquitomix"], hash : {filename : "mod.chiquitomix", sum : "7fd4465095f74dde0ac156afeb73c59d"}},
	zip         : {archiveFile : "test.zip", filenames : ["pewpewpew.flac", "subdir/zip_smile.png", "zip_hello.txt"], hash : {filename : "subdir/zip_smile.png", sum : "fe813e1041186ed0b65eb1e4bda01467"}}
};
/* eslint-enable comma-spacing, max-len */

tiptoe(
	function createOutDir()
	{
		fs.mkdir(OUTPUT_DIR, {recursive : true}, this);
	},
	function runTests()
	{
		Object.entries(TEST_PARAMS).serialForEach(([archiveType, archiveInfo], cb) =>
		{
			tiptoe(
				function removeExisting()
				{
					(archiveInfo.filenames || []).parallelForEach((filename, subcb) => fileUtil.unlink(path.join(OUTPUT_DIR, (filename.includes(path.sep) ? path.dirname(filename) : filename)), subcb), this);
				},
				function extract()
				{
					archiveUtil.extract(archiveType, path.join(FILES_DIR, archiveInfo.archiveFile), OUTPUT_DIR, this);
				},
				function getOutputHash(extractedFiles)
				{
					if(archiveInfo.filenames)
						assert(extractedFiles.equals(archiveInfo.filenames), "For [" + archiveType + "]\nGOT: " + JSON.stringify(extractedFiles) + "]\nEXPECTED: " + JSON.stringify(archiveInfo.filenames) + "\nIn: " + OUTPUT_DIR);
					
					hashUtil.hashFile("md5", path.join(OUTPUT_DIR, archiveInfo.hash.filename), this);
				},
				function verifyHash(hashResult)
				{
					assert.strictEqual(hashResult, archiveInfo.hash.sum);
					this();
				},
				cb
			);
		}, this);
	},
	function removeOutDir()
	{
		console.log("SUCCESS");
		
		fileUtil.unlink(OUTPUT_DIR, this);
	},
	XU.FINISH
);
