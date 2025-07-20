"use client";
import { motion } from 'framer-motion';
import { BotIcon, CoinIcon, LineChartIcon, CoinsIcon } from './icons';
import { Text } from './ui/text-animation-blur-fade-in';
import { FlippingText } from './ui/text-animation-flipping-words';

export function MarketingInfo() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.6,
      },
    },
  };

  const itemVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.9,
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: "easeOut",
      },
    },
  };

  return (
    <div className="mb-4 lg:mb-8">
      <div className="text-center mb-4">
        <div className="text-4xl md:text-5xl lg:text-7xl font-bold text-black dark:text-white mb-2">
          All AI Chats<br/><FlippingText words={["in One Place", "Easy to Use", "Free to Try"]} className="text-4xl md:text-5xl lg:text-7xl font-bold" />
        </div>
        <Text 
          className="text-gray-600 dark:text-gray-400 text-sm px-10 md:px-0"
          delay={0.3}
        >
          Pay per use • No monthly fees • Full spending control
        </Text>
      </div>

      <motion.div 
        className="grid grid-cols-2 md:grid-cols-4 gap-4 px-16 sm:px-8 pt-0 md:pt-4 lg:pt-8"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
      >
        <motion.div 
          className="text-center"
          variants={itemVariants}
          whileHover={{ 
            scale: 1.05,
            transition: { duration: 0.2 }
          }}
        >
          <motion.div 
            className="bg-blue-100 dark:bg-blue-900/30 rounded-full size-12 flex items-center justify-center mx-auto mb-2 shadow-lg shadow-blue-500/25 border border-blue-200/50 dark:border-blue-800/50"
            whileHover={{ 
              rotate: 5,
              transition: { duration: 0.2 }
            }}
          >
            <BotIcon />
          </motion.div>
          <p className="text-xs font-medium text-black dark:text-white">All Major Models</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 hidden md:block">GPT, Claude, Gemini & more</p>
        </motion.div>

        <motion.div 
          className="text-center"
          variants={itemVariants}
          whileHover={{ 
            scale: 1.05,
            transition: { duration: 0.2 }
          }}
        >
          <motion.div 
            className="bg-emerald-100 dark:bg-emerald-900/30 rounded-full size-12 flex items-center justify-center mx-auto mb-2 shadow-lg shadow-emerald-500/25 border border-emerald-200/50 dark:border-emerald-800/50"
            whileHover={{ 
              rotate: 5,
              transition: { duration: 0.2 }
            }}
          >
            <CoinIcon size={18} />
          </motion.div>
          <p className="text-xs font-medium text-black dark:text-white">Fair Pricing</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 hidden md:block">Pay only what you use</p>
        </motion.div>

        <motion.div 
          className="text-center"
          variants={itemVariants}
          whileHover={{ 
            scale: 1.05,
            transition: { duration: 0.2 }
          }}
        >
          <motion.div 
            className="bg-violet-100 dark:bg-violet-900/30 rounded-full size-12 flex items-center justify-center mx-auto mb-2 shadow-lg shadow-violet-500/25 border border-violet-200/50 dark:border-violet-800/50"
            whileHover={{ 
              rotate: 5,
              transition: { duration: 0.2 }
            }}
          >
            <LineChartIcon size={18} />
          </motion.div>
          <p className="text-xs font-medium text-black dark:text-white">Full Control</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 hidden md:block">Track every expense</p>
        </motion.div>

        <motion.div 
          className="text-center"
          variants={itemVariants}
          whileHover={{ 
            scale: 1.05,
            transition: { duration: 0.2 }
          }}
        >
          <motion.div 
            className="bg-amber-100 dark:bg-amber-900/30 rounded-full size-12 flex items-center justify-center mx-auto mb-2 shadow-lg shadow-amber-500/25 border border-amber-200/50 dark:border-amber-800/50"
            whileHover={{ 
              rotate: 5,
              transition: { duration: 0.2 }
            }}
          >
            <CoinsIcon size={18} />
          </motion.div>
          <p className="text-xs font-medium text-black dark:text-white">Buy Credits</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 hidden md:block">Use over time</p>
        </motion.div>
      </motion.div>

      <motion.div 
        className="mt-0 lg:mt-4 text-center pt-4"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ 
          opacity: 1, 
          y: 0,
          transition: {
            duration: 0.5,
            delay: 1.2,
            ease: "easeOut"
          }
        }}
        viewport={{ once: true, amount: 0.3 }}
      >
        <motion.div 
          className="inline-flex items-center px-3 py-1 text-xs text-gray-700 dark:text-gray-300"
          whileHover={{
            scale: 1.05,
            transition: { duration: 0.2 }
          }}
        >
          <motion.span 
            className="size-3 bg-green-500 rounded-full mr-2"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.8, 1, 0.8],
            }}
            transition={{
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut"
            }}
          />
          Start with as little as $5 • No subscriptions
        </motion.div>
      </motion.div>
    </div>
  );
}
