"use client";
import React from "react";
import { motion } from "motion/react";

const testimonials = [
  {
    text: "CV Tailor transformed my job search. My tailored resume got me interviews at top companies within days.",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face",
    name: "Briana Patton",
    role: "Operations Manager",
  },
  {
    text: "Incredibly fast and accurate. It matched my resume perfectly to each job description without losing my voice.",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face",
    name: "Bilal Ahmed",
    role: "Software Engineer",
  },
  {
    text: "The ATS optimization alone is worth it. I started getting callbacks for roles I was previously being ghosted on.",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face",
    name: "Saman Malik",
    role: "Product Manager",
  },
  {
    text: "I used to spend hours rewriting my CV for each application. Now it takes under a minute. Game changer.",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=face",
    name: "Omar Raza",
    role: "Marketing Director",
  },
  {
    text: "Landed my dream role at a FAANG company. The tailored resume made all the difference in getting past screening.",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=face",
    name: "Zainab Hussain",
    role: "Data Scientist",
  },
  {
    text: "Smart keyword matching and clean formatting. Recruiters have actually commented on how well my CV reads.",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop&crop=face",
    name: "Aliza Khan",
    role: "UX Designer",
  },
  {
    text: "Switched careers and needed my transferable skills to shine. CV Tailor highlighted exactly what recruiters wanted.",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face",
    name: "Farhan Siddiqui",
    role: "Business Analyst",
  },
  {
    text: "Three offers in two weeks after using this tool. The quality of my tailored CVs was noticeably higher.",
    image: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=80&h=80&fit=crop&crop=face",
    name: "Sana Sheikh",
    role: "Sales Manager",
  },
  {
    text: "Worth every penny. My response rate went from nearly zero to consistent interview invites.",
    image: "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=80&h=80&fit=crop&crop=face",
    name: "Hassan Ali",
    role: "Finance Analyst",
  },
];

export { testimonials };

export const TestimonialsColumn = (props: {
  className?: string;
  testimonials: typeof testimonials;
  duration?: number;
}) => {
  return (
    <div className={props.className}>
      <motion.div
        animate={{ translateY: "-50%" }}
        transition={{
          duration: props.duration || 10,
          repeat: Infinity,
          ease: "linear",
          repeatType: "loop",
        }}
        className="flex flex-col gap-6 pb-6"
      >
        {[...new Array(2).fill(0).map((_, index) => (
          <React.Fragment key={index}>
            {props.testimonials.map(({ text, name, role }, i) => (
              <div
                className="p-8 rounded-3xl border border-slate-100 shadow-md shadow-slate-200/60 max-w-xs w-full bg-white"
                key={i}
              >
                <p className="text-sm text-slate-600 leading-relaxed">{text}</p>
                <div className="flex items-center gap-3 mt-5">
                  <div className="flex flex-col">
                    <div className="font-semibold text-slate-800 text-sm leading-5">{name}</div>
                    <div className="text-xs text-slate-400 leading-5">{role}</div>
                  </div>
                </div>
              </div>
            ))}
          </React.Fragment>
        ))]}
      </motion.div>
    </div>
  );
};
