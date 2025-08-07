"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Auth from "@/src/components/Auth.jsx";
import styled from "styled-components";
import Image from "next/image";

const AppHeader = styled.header`
  background-color: #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  width: 100%;
  position: sticky;
  top: 0;
  z-index: 100;
  left: 0;
  right: 0;
`;

const HeaderContainer = styled.div`
  //   max-width: 1200px;
  margin: 10px 0px;
  padding: 0px 20px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const AppTitle = styled.h1`
  font-size: 1.5rem;
  font-weight: bold;
  color: #333333;
  margin-right: 2rem;
  flex-shrink: 0;
`;

const HeaderNav = styled.nav`
  display: flex;
  align-items: center;
  flex: 1;
  justify-content: flex-end;
  gap: 2rem;
`;

const DesktopMenu = styled.div`
  display: flex;
  align-items: center;
  gap: 2rem;

  @media (max-width: 767px) {
    display: none;
  }
`;

const HeaderUserMenu = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-shrink: 0;
  margin-left: 2rem;

  @media (max-width: 767px) {
    display: none;
  }
`;

const MobileMenuButton = styled.button`
  display: block;
  padding: 0.5rem;
  background: none;
  border: none;
  cursor: pointer;

  @media (min-width: 768px) {
    display: none;
  }
`;

const NavItem = styled.div`
  position: relative;
`;

const NavButton = styled.button`
  display: flex;
  align-items: center;
  font-weight: 600;
  color: #333333;
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.125rem;
  letter-spacing: 0.01em;
`;

const DropdownIcon = styled.svg`
  margin-left: 0.25rem;
  width: 16px;
  height: 16px;
`;

const DropdownMenu = styled.div`
  position: absolute;
  left: 0;
  top: 100%;
  width: 12rem;
  background-color: #ffffff;
  border-radius: 0.375rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  display: none;
  z-index: 101;
  padding-top: 8px;

  ${NavItem}:hover & {
    display: block;
  }
`;

const DropdownItem = styled(Link)`
  display: block;
  padding: 0.5rem 1rem;
  color: #333333;
  text-decoration: none;
  font-size: 0.875rem;

  &:hover {
    background-color: #f3f4f6;
  }

  &.active {
    background-color: #e5edff;
    color: #1e40af;
  }
`;

const UserMenuButton = styled.button`
  display: flex;
  align-items: center;
  background: none;
  border: none;
  cursor: pointer;
`;

const UserDropdownIcon = styled.svg`
  margin-left: 0.25rem;
  width: 20px;
  height: 20px;
`;

const UserDropdownMenu = styled.div`
  position: absolute;
  right: 0;
  top: 100%;
  background: #fff;
  border-radius: 0.375rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
  z-index: 102;
  min-width: 10rem;
`;

const UserDropdownItem = styled.button`
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  color: #333333;
  font-size: 1rem;
  cursor: pointer;

  &:hover {
    background-color: #f3f4f6;
  }
`;

const MobileMenu = styled.div`
  display: block;
  padding-bottom: 1rem;

  @media (min-width: 768px) {
    display: none;
  }
`;

const Header = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const navigation = [
    {
      category: "Dashboard",
      path: "/dashboard", // direct link if no sub-items
      items: [],
    },
    {
      category: "Patient Encounters",
      items: [
        { name: "New Patient Encounter", path: "/new-patient-encounter" },
        { name: "View Patient Encounters", path: "/view-patient-encounters" },
      ],
    },
    {
      category: "Soap Notes",
      items: [
        // { name: "New Soap Note", path: "/new-soap-note" },
        { name: "View Soap Notes", path: "/view-soap-notes" },
      ],
    },
  ];

  const handleSignOut = async () => {
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "sign-out" }),
      });

      if (response.ok) {
        localStorage.removeItem("jwt");
        router.push("/login");
      } else {
        console.error("Sign out failed", response.message);
      }
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const DefaultUserAvatar = () => (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="user-avatar-default"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        fill="#e5e7eb"
        stroke="#9ca3af"
        strokeWidth="1"
      />
      <circle cx="12" cy="10" r="3" fill="#6b7280" />
      <path
        d="M7 18.5c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5"
        stroke="#6b7280"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );

  return (
    <>
      <Auth />
      <AppHeader>
        <HeaderContainer>
          <Link
            href="/dashboard"
            style={{
              display: "flex",
              alignItems: "center",
              textDecoration: "none",
            }}
          >
            <Image
              src="/icon128.png"
              alt="EmScribe Logo"
              width={32}
              height={32}
              style={{ marginRight: "0.75rem" }}
            />
            <AppTitle style={{ margin: 0, color: "#333333" }}>
              EmScribe
            </AppTitle>
          </Link>
          <HeaderNav>
            <DesktopMenu>
              {navigation.map((nav) => (
                <NavItem key={nav.category}>
                  {nav.items && nav.items.length > 0 ? (
                    <NavButton>
                      {nav.category}
                      {nav.items && nav.items.length > 0 && (
                        <DropdownIcon viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </DropdownIcon>
                    )}
                  </NavButton>): ("")}
                  {nav.items && nav.items.length > 0 ? (
                    <DropdownMenu>
                      {nav.items.map((item) => (
                        <DropdownItem
                          key={item.path}
                          href={item.path}
                          className={pathname === item.path ? "active" : ""}
                        >
                          {item.name}
                        </DropdownItem>
                      ))}
                    </DropdownMenu>
                  ) : (
                    <DropdownItem
                      key={nav.path}
                      href={nav.path}
                      className={pathname === nav.path ? "active" : ""}
                    >
                      {nav.category}
                    </DropdownItem>
                  )}
                </NavItem>
              ))}
            </DesktopMenu>
            <HeaderUserMenu>
              <UserMenuButton onClick={() => setUserMenuOpen(!userMenuOpen)}>
                <DefaultUserAvatar />
                <UserDropdownIcon viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </UserDropdownIcon>
              </UserMenuButton>
              {userMenuOpen && (
                <UserDropdownMenu>
                  <UserDropdownItem onClick={handleSignOut}>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      style={{ marginRight: "0.5rem" }}
                    >
                      <path
                        d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Sign Out
                  </UserDropdownItem>
                </UserDropdownMenu>
              )}
            </HeaderUserMenu>
            <MobileMenuButton onClick={() => setMenuOpen(!menuOpen)}>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {menuOpen ? (
                  <path
                    d="M6 18L18 6M6 6L18 18"
                    stroke="#333333"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : (
                  <path
                    d="M4 6H20M4 12H20M4 18H20"
                    stroke="#333333"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </svg>
            </MobileMenuButton>
          </HeaderNav>
        </HeaderContainer>
        {menuOpen && (
          <MobileMenu>
            {navigation.map((nav) => (
              <div key={nav.category} className="mt-4">
                <h3 className="font-medium text-gray-500 px-2">
                  {nav.category}
                </h3>
                <div className="mt-1 space-y-1">
                  {nav.items.map((item) => (
                    <Link
                      key={item.path}
                      href={item.path}
                      className={`block px-3 py-2 rounded-md text-base font-medium ${
                        pathname === item.path
                          ? "bg-blue-100 text-blue-700"
                          : "text-gray-900 hover:bg-gray-50"
                      }`}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={handleSignOut}
                className="flex items-center w-full px-3 py-2 rounded-md text-base font-medium text-gray-900 hover:bg-gray-50"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ marginRight: "0.5rem" }}
                >
                  <path
                    d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Sign Out
              </button>
            </div>
          </MobileMenu>
        )}
      </AppHeader>
    </>
  );
};

export default Header;
