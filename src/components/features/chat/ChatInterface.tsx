"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "@/hooks/useTranslation";
import { Plus, Send } from "lucide-react";
import { Message } from "ai";

interface ChatInterfaceProps {
  isLoading?: boolean;
  chatHistory: Message[];
  inputValue: string;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ChatInterface({ 
  isLoading = false, 
  chatHistory = [],
  inputValue,
  handleInputChange,
}: ChatInterfaceProps) {
  const { t } = useTranslation();
  
  return (
    <div className="w-full">
      <div className="relative mx-auto w-full overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
        <div className="relative flex w-full items-center justify-center p-4">
          <div className="z-20 w-full">
            <ScrollArea className="max-h-[60vh] w-full overflow-auto p-1">
              {chatHistory.length === 0 ? (
                <div className="px-6">
                  <div className="relative flex h-full w-full flex-col items-center justify-center text-center">
                    <h2 className="mb-2 text-2xl font-bold">
                      <span className="text-neutral-800 dark:text-neutral-100">Ask </span>
                      <span className="text-[#009BFF]">Briki</span>
                    </h2>
                    <h1 className="text-lg font-medium text-neutral-800 dark:text-neutral-200">
                      <span className="text-[#009BFF]">Create</span>
                      <span> your roadmap</span>
                    </h1>
                  </div>
                  <Separator className="my-4" />
                  <p className="mx-auto mt-1 text-center text-sm text-neutral-600 dark:text-neutral-200 md:max-w-2xl text-opacity-100">
                    {t('project.creation.description')}
                  </p>
                </div>
              ) : (
                <div id="chat" className="w-full space-y-4 px-4">
                  {chatHistory.map((message, index) => (
                    <React.Fragment key={`${message.id}-${message.content}`}>
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={cn(
                          "flex w-full",
                          message.role === "user" ? "justify-end" : "justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[80%] rounded-lg px-4 py-2",
                            message.role === "user"
                              ? "bg-[#009BFF] text-white"
                              : "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                          )}
                        >
                          <p className="text-sm">{message.content}</p>
                        </div>
                      </motion.div>
                    </React.Fragment>
                  ))}
                </div>
              )}
            </ScrollArea>

            <Separator className="my-4" />

            <div className="relative mt-2 w-full">
                <Input
                  className="pl-12 pr-12 text-neutral-900 placeholder:text-neutral-500 dark:bg-neutral-800 dark:text-white dark:placeholder:text-neutral-400"
                  value={inputValue}
                  onChange={handleInputChange}
                  placeholder={t('project.creation.input_placeholder')}
                  disabled={isLoading}
                />
                
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  className="absolute left-1.5 top-1.5 h-7 rounded-sm text-neutral-500 hover:text-neutral-900 dark:text-neutral-200 dark:hover:text-neutral-100 text-opacity-100"
                  onClick={() => handleInputChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>)}
                >
                  <Plus className="h-5 w-5" />
                  <span className="sr-only">New Chat</span>
                </Button>

                <Button
                  type="submit"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1.5 top-1.5 h-7 rounded-sm text-neutral-500 hover:text-neutral-900 dark:text-neutral-200 dark:hover:text-neutral-100 text-opacity-100"
                  disabled={isLoading || !inputValue.trim()}
                >
                  {isLoading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-800 dark:border-neutral-600 dark:border-t-neutral-200" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 