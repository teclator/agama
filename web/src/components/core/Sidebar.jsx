/*
 * Copyright (c) [2022] SUSE LLC
 *
 * All Rights Reserved.
 *
 * This program is free software; you can redistribute it and/or modify it
 * under the terms of version 2 of the GNU General Public License as published
 * by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for
 * more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program; if not, contact SUSE LLC.
 *
 * To contact SUSE LLC about this file by physical or electronic mail, you may
 * find current contact information at www.suse.com.
 */

import React, { useState } from "react";
import { Icon, PageActions } from "~/components/layout";
import { About, ChangeProductButton, LogsButton, ShowLogButton, ShowTerminalButton } from "~/components/core";
import { TargetIpsPopup } from "~/components/network";

/**
 * D-Installer sidebar navigation
 */
export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  return (
    <>
      <PageActions>
        <button
          onClick={open}
          aria-label="Open D-Installer options"
          aria-controls="navigation-and-options"
          aria-expanded={isOpen}
        >
          <Icon name="menu" onClick={open} />
        </button>
      </PageActions>

      <nav
        aria-label="D-Installer options"
        data-state={isOpen ? "visible" : "hidden"}
        id="navigation-and-options"
        className="wrapper sidebar"
      >
        <header className="split justify-between">
          <h1>Options</h1>

          <button
            onClick={close}
            aria-label="Close D-Installer options"
          >
            <Icon name="menu_open" data-variant="flip-X" onClick={close} />
          </button>
        </header>

        <div className="flex-stack">
          <ChangeProductButton onClickCallback={close} />
          <About onClickCallback={close} />
          <TargetIpsPopup onClickCallback={close} />
          <LogsButton />
          <ShowLogButton onClickCallback={close} />
          <ShowTerminalButton onClickCallback={close} />
        </div>

        <footer className="split" data-state="reversed">
          <a onClick={close}>
            Close <Icon size="16" name="menu_open" data-variant="flip-X" />
          </a>
        </footer>
      </nav>
    </>
  );
}
