import React from 'react';
import { motion } from 'framer-motion';

const ScrollReveal = ({ children, delay = 0, yOffset = 30, duration = 0.8, className = "" }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: yOffset }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
            className={className}
        >
            {children}
        </motion.div>
    );
};

export default ScrollReveal;
