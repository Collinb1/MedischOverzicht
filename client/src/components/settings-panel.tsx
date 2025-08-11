import { useState } from "react";
import { Settings, Building, Mail, Users, Database, Shield, Bell, Palette } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import CabinetManagement from "./cabinet-management";

interface SettingsPanelProps {
  onClose?: () => void;
}

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState("cabinets");

  const settingsSections = [
    {
      id: "cabinets",
      title: "Kasten Beheren",
      description: "Beheer medische kasten en hun configuratie",
      icon: Building,
      color: "bg-blue-50 text-blue-600 border-blue-200",
      count: null,
    },
    {
      id: "posts",
      title: "Ambulanceposten",
      description: "Beheer ambulanceposten en locaties",
      icon: Database,
      color: "bg-green-50 text-green-600 border-green-200",
      count: null,
    },
    {
      id: "users",
      title: "Contactpersonen",
      description: "Beheer gebruikers en contactpersonen per post",
      icon: Users,
      color: "bg-purple-50 text-purple-600 border-purple-200",
      count: null,
    },
    {
      id: "email",
      title: "E-mail Instellingen",
      description: "Configureer SMTP en e-mail notificaties",
      icon: Mail,
      color: "bg-orange-50 text-orange-600 border-orange-200",
      count: null,
    },
    {
      id: "system",
      title: "Systeem Instellingen",
      description: "Algemene applicatie configuratie",
      icon: Settings,
      color: "bg-gray-50 text-gray-600 border-gray-200",
      count: null,
    }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "cabinets":
        return <CabinetManagement />;
      case "posts":
        return (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Ambulanceposten Beheer</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Beheer functionaliteit voor ambulanceposten komt binnenkort beschikbaar.
            </p>
          </div>
        );
      case "users":
        return (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Gebruikers Beheer</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Gebruikersbeheer functionaliteit komt binnenkort beschikbaar.
            </p>
          </div>
        );
      case "email":
        return (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">E-mail Instellingen</h3>
            <p className="text-gray-600 dark:text-gray-400">
              E-mail configuratie functionaliteit komt binnenkort beschikbaar.
            </p>
          </div>
        );
      case "system":
        return (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Systeem Instellingen</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Systeem configuratie functionaliteit komt binnenkort beschikbaar.
            </p>
          </div>
        );
      default:
        return <CabinetManagement />;
    }
  };

  return (
    <div className="w-full h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Settings className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Instellingen
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Beheer uw medische inventaris systeem
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            Versie 1.0
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full">
        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-6">
            <TabsList className="grid grid-cols-1 w-full gap-2 h-auto bg-transparent p-0">
              {settingsSections.map((section) => {
                const IconComponent = section.icon;
                return (
                  <TabsTrigger
                    key={section.id}
                    value={section.id}
                    className={`
                      w-full justify-start p-4 h-auto text-left rounded-lg border
                      data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 
                      data-[state=active]:border-blue-200 data-[state=active]:shadow-sm
                      hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200
                      border-gray-200 dark:border-gray-600
                    `}
                    data-testid={`tab-${section.id}`}
                  >
                    <div className="flex items-start space-x-3 w-full">
                      <div className={`p-2 rounded-md ${
                        activeTab === section.id 
                          ? 'bg-blue-100 dark:bg-blue-900' 
                          : 'bg-gray-100 dark:bg-gray-700'
                      }`}>
                        <IconComponent className={`w-4 h-4 ${
                          activeTab === section.id 
                            ? 'text-blue-600 dark:text-blue-400' 
                            : 'text-gray-600 dark:text-gray-400'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-sm truncate">
                            {section.title}
                          </h3>
                          {section.count && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              {section.count}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-tight">
                          {section.description}
                        </p>
                      </div>
                    </div>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <Separator className="my-6" />

            {/* Quick Stats */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white flex items-center">
                <Shield className="w-4 h-4 mr-2 text-gray-500" />
                Systeemstatus
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Database</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                    Online
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">E-mail Service</span>
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 border-yellow-200">
                    Configuratie vereist
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Opslag</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                    Actief
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-auto">
            <div className="p-6">
              {settingsSections.map((section) => (
                <TabsContent 
                  key={section.id} 
                  value={section.id} 
                  className="mt-0 space-y-6"
                  data-testid={`content-${section.id}`}
                >
                  {/* Section Header */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-start space-x-4">
                      <div className={`p-3 rounded-lg ${section.color}`}>
                        <section.icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                          {section.title}
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                          {section.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Section Content */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    {renderTabContent()}
                  </div>
                </TabsContent>
              ))}
            </div>
          </div>
        </div>
      </Tabs>
    </div>
  );
}