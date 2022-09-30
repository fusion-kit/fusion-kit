import { Dialog, Transition } from "@headlessui/react";
import {
  Bars3Icon, Cog6ToothIcon, MegaphoneIcon, PaintBrushIcon, Squares2X2Icon, XMarkIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import React, { Fragment, useState } from "react";
import { Outlet, NavLink } from "react-router-dom";
import logo from "../assets/logo.svg";
import { useIsUpdateAvailable } from "./hooks";

const navigation = [
  {
    name: "Dream", href: "/", icon: PaintBrushIcon,
  },
  {
    name: "Gallery", href: "/gallery", icon: Squares2X2Icon,
  },
  {
    name: "Settings", href: "/settings", icon: Cog6ToothIcon,
  },
];

export const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
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
                      src={logo}
                      alt="FusionKit"
                    />
                  </div>
                  <nav aria-label="Sidebar" className="mt-5">
                    <div className="space-y-1 px-2">
                      {navigation.map((item) => (
                        <NavLink
                          key={item.href}
                          to={item.href}
                          end
                          onClick={() => setSidebarOpen(false)}
                          className={({ isActive }) => clsx(
                            isActive
                              ? "bg-gray-100 text-gray-900"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                            "group flex items-center px-2 py-2 text-base font-medium rounded-md",
                          )}
                        >
                          {({ isActive }) => (
                            <>
                              <item.icon
                                className={clsx(
                                  isActive ? "text-gray-500" : "text-gray-400 group-hover:text-gray-500",
                                  "mr-4 h-6 w-6",
                                )}
                                aria-hidden="true"
                              />
                              {item.name}
                            </>
                          )}
                        </NavLink>
                      ))}
                    </div>
                  </nav>
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
                  src={logo}
                  alt="FusionKit"
                />
              </div>
              <nav className="mt-5 flex-1" aria-label="Sidebar">
                <div className="space-y-1 px-2">
                  {navigation.map((item) => (
                    <NavLink
                      key={item.href}
                      to={item.href}
                      end
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) => clsx(
                        isActive
                          ? "bg-gray-200 text-gray-900"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                        "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                      )}
                    >
                      {({ isActive }) => (
                        <>
                          <item.icon
                            className={clsx(
                              isActive ? "text-gray-500" : "text-gray-400 group-hover:text-gray-500",
                              "mr-3 h-6 w-6",
                            )}
                            aria-hidden="true"
                          />
                          {item.name}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </nav>
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
                src={logo}
                alt="FusionKit"
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
          <Outlet />
        </div>
      </div>
      <UpdateBanner />
    </div>
  );
};

const UpdateBanner: React.FC = () => {
  const isUpdateAvailable = useIsUpdateAvailable();
  const [isVisible, setIsVisible] = useState(true);

  if (!isUpdateAvailable || !isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 pb-2 sm:pb-5">
      <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-indigo-600 p-2 shadow-lg sm:p-3">
          <div className="flex flex-wrap items-center justify-between">
            <div className="flex w-0 flex-1 items-center">
              <span className="flex rounded-lg bg-indigo-800 p-2">
                <MegaphoneIcon className="h-6 w-6 text-white" aria-hidden="true" />
              </span>
              <p className="ml-3 truncate font-medium text-white">
                <span className="md:hidden">FusionKit update available</span>
                <span className="hidden md:inline">A new version of FusionKit is now available</span>
              </p>
            </div>
            <div className="order-3 mt-2 w-full flex-shrink-0 sm:order-2 sm:mt-0 sm:w-auto">
              <a
                href="https://github.com/fusion-kit/fusion-kit"
                className="flex items-center justify-center rounded-md border border-transparent bg-white px-4 py-2 text-sm font-medium text-indigo-600 shadow-sm hover:bg-indigo-50"
                target="_blank"
                rel="noreferrer"
              >
                Download now
              </a>
            </div>
            <div className="order-2 flex-shrink-0 sm:order-3 sm:ml-2">
              <button
                type="button"
                className="-mr-1 flex rounded-md p-2 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-white"
                onClick={() => setIsVisible(false)}
              >
                <span className="sr-only">Dismiss</span>
                <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
