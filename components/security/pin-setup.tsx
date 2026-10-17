"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Segmented } from "@/components/ui/segmented";
import { PinKeypad } from "@/components/security/pin-keypad";

export function PinSetup({ onDone, title = "Set a PIN", subtitle }: { onDone: (pin: string) => Promise<void>; title?: string; subtitle?: string }) {
  const [length, setLength] = useState<"4" | "6">("6");
  const [first, setFirst] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-center text-center">
      <AnimatePresence mode="wait">
        <motion.div key={first ? "confirm" : "enter"} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
          <h1 className="text-[24px] font-semibold tracking-[-0.02em]">{first ? "Confirm your PIN" : title}</h1>
          <p className="mt-1.5 text-[14px] text-fg-2">
            {first ? "Enter it once more." : subtitle ?? "A quick way to open the app on this device."}
          </p>
        </motion.div>
      </AnimatePresence>
      {!first ? (
        <Segmented<"4" | "6">
          className="mt-5"
          size="sm"
          ariaLabel="PIN length"
          value={length}
          onChange={setLength}
          options={[
            { value: "4", label: "4 digits" },
            { value: "6", label: "6 digits" },
          ]}
        />
      ) : (
        <div className="mt-5 h-[38px]" />
      )}
      <p className="mt-4 h-5 text-[13px] text-payable" aria-live="assertive">
        {message}
      </p>
      <div className="mt-3">
        <PinKeypad
          key={`${first ? "c" : "e"}-${length}`}
          length={Number(length)}
          label={first ? "Confirm PIN" : "New PIN"}
          onComplete={async (pin) => {
            if (!first) {
              if (/^(\d)\1+$/.test(pin) || "0123456789".includes(pin) || "9876543210".includes(pin)) {
                setMessage("Pick something less easy to guess.");
                return false;
              }
              setMessage(null);
              setFirst(pin);
              return true;
            }
            if (pin !== first) {
              setMessage("Those didn't match. Start again.");
              setFirst(null);
              return false;
            }
            setMessage(null);
            try {
              await onDone(pin);
              return true;
            } catch (e) {
              setMessage(e instanceof Error ? e.message : "Couldn't save your PIN.");
              setFirst(null);
              return false;
            }
          }}
        />
      </div>
    </div>
  );
}
