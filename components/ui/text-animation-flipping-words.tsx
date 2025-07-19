"use client";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import React, { useEffect, useState } from "react";

const FlippingText = ({
  words,
  className,
}: {
  words: string[];
  className?: string;
}) => {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [visibleCharacters, setVisibleCharacters] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const currentWord = words[currentWordIndex];

  useEffect(() => {
    const typingSpeed = 100; // Speed for typing characters (increased from 50)
    const deletingSpeed = 60; // Speed for deleting characters (increased from 50) 
    const pauseBeforeDelete = 3500; // Pause before starting to delete (increased from 1000)

    let timeout: NodeJS.Timeout;

    if (!isDeleting && visibleCharacters < currentWord.length) {
      // Typing mode - add characters
      timeout = setTimeout(() => {
        setVisibleCharacters((prev) => prev + 1);
      }, typingSpeed);
    } else if (!isDeleting && visibleCharacters === currentWord.length) {
      // Finished typing - pause before deleting
      timeout = setTimeout(() => {
        setIsDeleting(true);
      }, pauseBeforeDelete);
    } else if (isDeleting && visibleCharacters > 0) {
      // Deleting mode - remove characters
      timeout = setTimeout(() => {
        setVisibleCharacters((prev) => prev - 1);
      }, deletingSpeed);
    } else if (isDeleting && visibleCharacters === 0) {
      // Finished deleting - move to next word
      setIsDeleting(false);
      setCurrentWordIndex((prev) => (prev + 1) % words.length);
    }

    return () => clearTimeout(timeout);
  }, [
    currentWord,
    currentWordIndex,
    isDeleting,
    visibleCharacters,
    words.length,
  ]);

  return (
    <span className={cn("relative inline-block", className)}>
      <span className="tracking-tighter">
        {currentWord
          .substring(0, visibleCharacters)
          .split("")
          .map((char, index) => (
            <motion.span
              key={`${index}-${char}`}
              initial={{
                opacity: 0,
                rotateY: 90,
                y: 10,
                filter: "blur(10px)",
              }}
              animate={{
                opacity: 1,
                rotateY: 0,
                y: 0,
                filter: "blur(0px)",
              }}
              exit={{
                opacity: 0,
                rotateY: -90,
                y: -10,
                filter: "blur(10px)",
              }}
              transition={{ duration: 0.3 }}
              className="inline-block"
              style={{ minWidth: char === ' ' ? '0.25em' : 'auto' }}
            >
              {char === ' ' ? '\u00A0' : char}
            </motion.span>
          ))}
      </span>
      <motion.span
        layout
        className="absolute -right-4 bottom-2 inline-block rounded-full bg-black dark:bg-white"
        style={{
          width: isDeleting ? "0.45em" : "0.25em",
          height: "0.25em",
        }}
        animate={{
          backgroundColor: isDeleting
            ? "#ef4444" // hex for red-500
            : [
                "#60a5fa", // hex for blue-400
                "#22c55e", // hex for green-500
                "#3b82f6", // hex for blue-500
              ],
        }}
        transition={{
          duration: 0.1,
        }}
      />
    </span>
  );
};

export { FlippingText };
