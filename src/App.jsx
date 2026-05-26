import { useState } from 'react'
import Turnstile from 'react-turnstile'
import { motion } from 'framer-motion'
import { FaGithub, FaLine, FaDiscord, FaGem, FaCross, FaSkullCrossbones } from 'react-icons/fa'
import './App.css'


const siteKey = import.meta.env.VITE_TURNSTILE_SITEKEY

export default function CardLanding() {
  const [verified, setVerified] = useState(false)

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-gradient-to-br from-[#351056] via-[#43186b] to-[#54298d]">
      {!verified ? (
        <Turnstile
          sitekey={siteKey}
          onVerify={() => setVerified(true)}
          theme="dark"
          options={{ 
            size: "invisible",
            action: "view_card" 
          }}
        />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative rounded-3xl overflow-hidden p-[2px]"
        >
          {/* твоя визитка */}
          <div className="relative z-10 rounded-3xl bg-[#1a102b]/95 w-80 p-8 flex flex-col items-center text-center backdrop-blur-md shadow-2xl">
            <img src="https://i.pinimg.com/736x/71/35/65/7135659e8289d902c5293cd9789f6a42.jpg" alt="avatar"
              className="w-24 h-24 rounded-full border-2 border-purple-400 mb-4" />
            <h1 className="text-white text-2xl font-bold">高崎</h1>
            <p className="text-slate-300 text-sm mt-2">aka blackpilledneko</p>
            <p className="text-slate-100 text-sm mt-2">Wireless & Embedded Engineer</p>
            <p className="text-slate-500 text-sm mt-2">QNX • C/C++ • nRF • i.MX • RISC-V</p>
            <p className="text-slate-500 text-sm mt-2">Linux • RTOS • Qt</p>
            <div className="flex gap-5 mt-6 text-2xl">
              <a href="https://github.com/hayatotk" className="text-slate-400 hover:text-white transition"><FaGithub /></a>
              <a href="https://йоктопобеда.рф/en" className="text-slate-400 hover:text-[#06c755] transition"><FaGem /></a>
              <a href="#" className="text-slate-400 hover:text-[#7289da] transition"><FaSkullCrossbones /></a>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
