"use client";
import { useState, useRef, useEffect } from "react";

interface VoiceRecorderProps {
  onTranscriptUpdate: (transcript: string) => void;
}
