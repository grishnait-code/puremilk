import React, { createContext, useContext, useState } from "react";

const EnterpriseContext = createContext(null);

export function EnterpriseProvider({ children }) {
  const [selectedEnterprise, setSelectedEnterprise] = useState(null);
  // { id: number, name: string } | null — null означает "Все предприятия"
  return (
    <EnterpriseContext.Provider value={{ selectedEnterprise, setSelectedEnterprise }}>
      {children}
    </EnterpriseContext.Provider>
  );
}

export function useEnterprise() {
  return useContext(EnterpriseContext);
}
