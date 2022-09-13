import React, {
  Fragment, useCallback, useId, useRef, useState,
} from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  Bars3Icon,
  BeakerIcon,
  Cog6ToothIcon,
  PaintBrushIcon,
  PhotoIcon,
  Squares2X2Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { PaintBrushIcon as SolidPaintBrushIcon } from "@heroicons/react/24/solid";
import { clsx } from "clsx";
import Textarea from "react-expanding-textarea";
import { useMutation, useSubscription } from "@apollo/client";
import {
  StartDreamDocument, WatchDreamDocument, WatchDreamSubscription,
} from "./generated/graphql";
import { unreachable } from "./utils";

const navigation = [
  {
    name: "Dream", href: "#", icon: PaintBrushIcon, current: true,
  },
  {
    name: "Gallery", href: "#", icon: Squares2X2Icon, current: false,
  },
  {
    name: "Image Lab", href: "#", icon: BeakerIcon, current: false,
  },
  {
    name: "Settings", href: "#", icon: Cog6ToothIcon, current: false,
  },
];

export const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [startDream, startDreamResult] = useMutation(StartDreamDocument);

  const dreamId = startDreamResult.data?.startDream.id;

  const watchDreamResult = useSubscription(WatchDreamDocument, {
    variables: {
      dreamId: dreamId!,
    },
    skip: dreamId == null,
  });

  const onGenerate = useCallback(async (prompt: string) => {
    const response = await startDream({
      variables: {
        prompt,
      },
    });
    console.info("Started dream", { prompt, response });
  }, [startDream]);

  const dreamImages = getDreamImages(watchDreamResult.data);

  return (
    <>
      {/*
        This example requires updating your template:

        ```
        <html class="h-full bg-white">
        <body class="h-full overflow-hidden">
        ```
      */}
      <div className="flex h-full">
        <Transition.Root show={sidebarOpen} as={Fragment}>
          <Dialog as="div" className="relative z-40 lg:hidden" onClose={setSidebarOpen}>
            <Transition.Child
              as={Fragment}
              enter="transition-opacity ease-linear duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="transition-opacity ease-linear duration-300"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
            </Transition.Child>

            <div className="fixed inset-0 z-40 flex">
              <Transition.Child
                as={Fragment}
                enter="transition ease-in-out duration-300 transform"
                enterFrom="-translate-x-full"
                enterTo="translate-x-0"
                leave="transition ease-in-out duration-300 transform"
                leaveFrom="translate-x-0"
                leaveTo="-translate-x-full"
              >
                <Dialog.Panel className="relative flex w-full max-w-xs flex-1 flex-col bg-white focus:outline-none">
                  <Transition.Child
                    as={Fragment}
                    enter="ease-in-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in-out duration-300"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <div className="absolute top-0 right-0 -mr-12 pt-2">
                      <button
                        type="button"
                        className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                        onClick={() => setSidebarOpen(false)}
                      >
                        <span className="sr-only">Close sidebar</span>
                        <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
                      </button>
                    </div>
                  </Transition.Child>
                  <div className="h-0 flex-1 overflow-y-auto pt-5 pb-4">
                    <div className="flex flex-shrink-0 items-center px-4">
                      <img
                        className="h-8 w-auto"
                        src="https://tailwindui.com/img/logos/mark.svg?color=indigo&shade=600"
                        alt="Your Company"
                      />
                    </div>
                    <nav aria-label="Sidebar" className="mt-5">
                      <div className="space-y-1 px-2">
                        {navigation.map((item) => (
                          <a
                            key={item.name}
                            href={item.href}
                            className={clsx(
                              item.current
                                ? "bg-gray-100 text-gray-900"
                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                              "group flex items-center px-2 py-2 text-base font-medium rounded-md",
                            )}
                          >
                            <item.icon
                              className={clsx(
                                item.current ? "text-gray-500" : "text-gray-400 group-hover:text-gray-500",
                                "mr-4 h-6 w-6",
                              )}
                              aria-hidden="true"
                            />
                            {item.name}
                          </a>
                        ))}
                      </div>
                    </nav>
                  </div>
                  <div className="flex flex-shrink-0 border-t border-gray-200 p-4">
                    <a href="#" className="group block flex-shrink-0">
                      <div className="flex items-center">
                        <div>
                          <img
                            className="inline-block h-10 w-10 rounded-full"
                            src="https://images.unsplash.com/photo-1517365830460-955ce3ccd263?ixlib=rb-=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=8&w=256&h=256&q=80"
                            alt=""
                          />
                        </div>
                        <div className="ml-3">
                          <p className="text-base font-medium text-gray-700 group-hover:text-gray-900">
                            Whitney Francis
                          </p>
                          <p className="text-sm font-medium text-gray-500 group-hover:text-gray-700">View profile</p>
                        </div>
                      </div>
                    </a>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
              <div className="w-14 flex-shrink-0" aria-hidden="true">
                {/* Force sidebar to shrink to fit close icon */}
              </div>
            </div>
          </Dialog>
        </Transition.Root>

        {/* Static sidebar for desktop */}
        <div className="hidden lg:flex lg:flex-shrink-0">
          <div className="flex w-64 flex-col">
            {/* Sidebar component, swap this element with another sidebar if you like */}
            <div className="flex min-h-0 flex-1 flex-col border-r border-gray-200 bg-gray-100">
              <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
                <div className="flex flex-shrink-0 items-center px-4">
                  <img
                    className="h-8 w-auto"
                    src="https://tailwindui.com/img/logos/mark.svg?color=indigo&shade=600"
                    alt="Your Company"
                  />
                </div>
                <nav className="mt-5 flex-1" aria-label="Sidebar">
                  <div className="space-y-1 px-2">
                    {navigation.map((item) => (
                      <a
                        key={item.name}
                        href={item.href}
                        className={clsx(
                          item.current
                            ? "bg-gray-200 text-gray-900"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                          "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                        )}
                      >
                        <item.icon
                          className={clsx(
                            item.current ? "text-gray-500" : "text-gray-400 group-hover:text-gray-500",
                            "mr-3 h-6 w-6",
                          )}
                          aria-hidden="true"
                        />
                        {item.name}
                      </a>
                    ))}
                  </div>
                </nav>
              </div>
              <div className="flex flex-shrink-0 border-t border-gray-200 p-4">
                <a href="#" className="group block w-full flex-shrink-0">
                  <div className="flex items-center">
                    <div>
                      <img
                        className="inline-block h-9 w-9 rounded-full"
                        src="https://images.unsplash.com/photo-1517365830460-955ce3ccd263?ixlib=rb-=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=8&w=256&h=256&q=80"
                        alt=""
                      />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Whitney Francis</p>
                      <p className="text-xs font-medium text-gray-500 group-hover:text-gray-700">View profile</p>
                    </div>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="lg:hidden">
            <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-1.5">
              <div>
                <img
                  className="h-8 w-auto"
                  src="https://tailwindui.com/img/logos/mark.svg?color=indigo&shade=600"
                  alt="Your Company"
                />
              </div>
              <div>
                <button
                  type="button"
                  className="-mr-3 inline-flex h-12 w-12 items-center justify-center rounded-md text-gray-500 hover:text-gray-900"
                  onClick={() => setSidebarOpen(true)}
                >
                  <span className="sr-only">Open sidebar</span>
                  <Bars3Icon className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
          <div className="flex flex-1 flex-col lg:flex-row h-full relative">
            <main className="h-full flex-grow p-6 overflow-auto absolute inset-0">
              <div className="w-full max-w-2xl mx-auto">
                <PromptInput onGenerate={onGenerate} />
                {!startDreamResult.called || watchDreamResult.data?.watchDream.__typename === "FinishedDream" ? null : "Loading"}
                <ul className="py-6 gap-2 md:gap-4 grid justify-center grid-cols-repeat-fit-20">
                  {dreamImages.map((dreamImage) => (
                    <li key={dreamImage.imageUri}>
                      <div className="relative group max-w-32 aspect-w-10 aspect-h-7 block w-full overflow-hidden rounded-lg bg-gray-100 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 focus-within:ring-offset-gray-100">
                        <img src={dreamImage.imageUri} alt="" className="pointer-events-none object-cover group-hover:opacity-75" />
                        <button type="button" className="absolute inset-0 focus:outline-none">
                          <span className="sr-only">Expand image</span>
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </main>
            <aside className="hidden xl:block h-80 max-h-full w-auto lg:h-auto lg:w-80 border-l-0 lg:border-l p-6">Recent</aside>
          </div>
        </div>
      </div>
    </>
  );
};

interface PromptInputProps {
  onGenerate: (_prompt: string) => void,
}

const PromptInput: React.FC<PromptInputProps> = (props) => {
  const { onGenerate } = props;

  const promptInputId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [prompt, setPrompt] = useState("");

  const onSubmit = useCallback((e?: React.FormEvent) => {
    e?.stopPropagation();
    e?.preventDefault();

    onGenerate(prompt);
  }, [prompt, onGenerate]);

  const onPromptKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = useCallback((e) => {
    if (!e.shiftKey && e.key === "Enter") {
      e.stopPropagation();
      e.preventDefault();

      onSubmit();
    }
  }, [onSubmit]);

  return (
    <form onSubmit={onSubmit} ref={formRef} className="relative">
      <div className="overflow-hidden rounded-lg border border-gray-300 shadow-sm focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500">
        <label htmlFor={promptInputId} className="sr-only">
          Prompt
        </label>
        <Textarea
          rows={1}
          name="prompt"
          id={promptInputId}
          onKeyDown={onPromptKeyDown}
          className="block w-full resize-none border-0 py-4 placeholder-gray-500 focus:ring-0 sm:text-sm"
          placeholder="Enter a prompt..."
          onChange={(e) => { setPrompt(e.target.value); }}
          value={prompt}
        />

        {/* Spacer element to match the height of the toolbar */}
        <div aria-hidden="true">
          <div className="h-px" />
          <div className="py-2">
            <div className="py-px">
              <div className="h-9" />
            </div>
          </div>
        </div>
      </div>

      <div className="absolute inset-x-px bottom-0">
        <div className="flex items-center justify-between space-x-3 border-t border-gray-200 px-2 py-2 sm:px-3">
          <div className="flex">
            <button
              type="button"
              className="group -my-2 -ml-2 inline-flex items-center rounded-full px-3 py-2 text-left text-gray-400"
            >
              <PhotoIcon className="-ml-1 mr-2 h-5 w-5 group-hover:text-gray-500" aria-hidden="true" />
              <span className="text-sm italic text-gray-400 group-hover:text-gray-700">Add base image</span>
            </button>
          </div>
          <div className="flex-shrink-0">
            <button
              type="submit"
              className="inline-flex items-center space-x-2 rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <SolidPaintBrushIcon className="h-5 w-5" aria-hidden="true" />
              <span>Generate</span>
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};

function getDreamImages(dream?: WatchDreamSubscription): { imageUri: string }[] {
  if (dream == null) {
    return [];
  }

  return dream.watchDream.images.flatMap((dreamImage) => {
    switch (dreamImage.__typename) {
      case "PendingDreamImage":
        return [];
      case "RunningDreamImage":
        return dreamImage.previewImageUri != null ? [{ imageUri: dreamImage.previewImageUri }] : [];
      case "FinishedDreamImage":
        return [{ imageUri: dreamImage.imageUri }];
      case "StoppedDreamImage":
        return [];
      default:
        return unreachable(dreamImage);
    }
  });
}
