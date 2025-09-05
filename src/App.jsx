import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from './components/ui/alert';
import { UploadCloud, BarChart3, TrendingUp, Calendar, Info, ArrowLeft } from 'lucide-react';
import TimeseriesUploader from './components/TimeseriesUploader';
import PageTimeseriesView from './components/PageTimeseriesView';
import MonthlyComparisonView from './components/MonthlyComparisonView';
import TrendAnalysisView from './components/TrendAnalysisView';

function App() {
  const [hasData, setHasData] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [activeTab, setActiveTab] = useState('upload');
  const [uploadedPeriods, setUploadedPeriods] = useState([]);

  // Handler för när data har laddats upp framgångsrikt
  const handleDataUploaded = (periods) => {
    console.log('Data uploaded successfully:', periods);
    setUploadedPeriods(periods);
    setHasData(true);
    setShowUploader(false);
    setActiveTab('monthly'); // Växla till månadsanalys när data finns
  };

  // Handler för att avbryta upload och gå tillbaka
  const handleCancelUpload = () => {
    setShowUploader(false);
  };

  // Om uploader visas, visa bara den komponenten
  if (showUploader) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border">
          <div className="container py-4">
            <div className="flex items-center justify-between">
              <div className="facebook-brand flex items-center gap-3">
                <BarChart3 className="h-8 w-8" />
                <h1 className="text-2xl font-bold text-foreground">
                  Facebook API data analyser
                </h1>
              </div>
              <Button variant="outline" onClick={handleCancelUpload}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Tillbaka
              </Button>
            </div>
          </div>
        </header>

        <main className="container py-6">
          <TimeseriesUploader 
            onDataUploaded={handleDataUploaded}
            onCancel={handleCancelUpload}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container py-4">
          <div className="facebook-brand flex items-center gap-3">
            <BarChart3 className="h-8 w-8" />
            <h1 className="text-2xl font-bold text-foreground">
              Facebook API data analyser
            </h1>
          </div>
        </div>
      </header>

      <main className="container py-6">
        <div className="space-y-6">
          {!hasData ? (
            /* Välkomstvy - innan data laddats upp */
            <div className="space-y-6">
              <Card>
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">Välkommen till Facebook API data analyser</CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    Analysera och visualisera utvecklingen av dina Facebook-sidor över tid. 
                    Ladda upp månadsvis CSV-data från Facebook API för att komma igång.
                  </p>
                  
                  <Alert className="max-w-2xl mx-auto">
                    <Info className="h-4 w-4" />
                    <AlertTitle>CSV-format som krävs</AlertTitle>
                    <AlertDescription>
                      Filnamn: <code>FB_YYYY_MM.csv</code> (ex: FB_2025_08.csv)<br/>
                      Kolumner: Page, Page ID, Reach, Engaged Users, Engagements, Reactions, Publications, Status, Comment
                    </AlertDescription>
                  </Alert>

                  <div className="pt-4">
                    <Button size="lg" onClick={() => setShowUploader(true)}>
                      <UploadCloud className="mr-2 h-5 w-5" />
                      Ladda upp CSV-filer
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Feature preview */}
              <div className="grid md:grid-cols-3 gap-4">
                <Card className="opacity-50">
                  <CardHeader>
                    <Calendar className="h-8 w-8 text-facebook-500 mb-2" />
                    <CardTitle className="text-lg">Månadsanalys</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Jämför alla Facebook-sidor för en specifik månad och identifiera toppresterare
                    </p>
                  </CardContent>
                </Card>

                <Card className="opacity-50">
                  <CardHeader>
                    <TrendingUp className="h-8 w-8 text-facebook-500 mb-2" />
                    <CardTitle className="text-lg">Trendanalys</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Upptäck trender och utvecklingsmönster över tid för alla Facebook-sidor
                    </p>
                  </CardContent>
                </Card>

                <Card className="opacity-50">
                  <CardHeader>
                    <BarChart3 className="h-8 w-8 text-facebook-500 mb-2" />
                    <CardTitle className="text-lg">Sidanalys</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Djupdyk i specifika Facebook-sidor och deras utveckling över månader
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            /* Huvudgränssnitt - när data finns */
            <div className="grid gap-6">
              {/* Data-status sektion */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-facebook-500" />
                    Uppladdad data
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 bg-facebook-50 rounded-lg">
                      <div className="text-2xl font-bold text-facebook-900">{uploadedPeriods.length}</div>
                      <div className="text-sm text-facebook-700">Månader</div>
                    </div>
                    <div className="text-center p-3 bg-facebook-50 rounded-lg">
                      <div className="text-2xl font-bold text-facebook-900">
                        {uploadedPeriods.reduce((acc, period) => acc + period.pageCount, 0)}
                      </div>
                      <div className="text-sm text-facebook-700">Totalt dataposter</div>
                    </div>
                    <div className="text-center p-3 bg-facebook-50 rounded-lg">
                      <div className="text-2xl font-bold text-facebook-900">
                        {uploadedPeriods.length > 0 ? Math.max(...uploadedPeriods.map(p => p.pageCount)) : 0}
                      </div>
                      <div className="text-sm text-facebook-700">Sidor per månad</div>
                    </div>
                  </div>
                  
                  {uploadedPeriods.length > 0 && (
                    <div>
                      <div className="text-sm font-medium mb-2">Tillgängliga perioder:</div>
                      <div className="flex flex-wrap gap-2">
                        {uploadedPeriods.map((period, index) => (
                          <span 
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-facebook-50 text-facebook-700 border border-facebook-200"
                          >
                            {period.displayName} ({period.pageCount} sidor)
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="upload">
                    <UploadCloud className="mr-2 h-4 w-4" />
                    Ladda data
                  </TabsTrigger>
                  <TabsTrigger value="monthly">
                    <Calendar className="mr-2 h-4 w-4" />
                    Månadsanalys
                  </TabsTrigger>
                  <TabsTrigger value="pages">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Sidanalys
                  </TabsTrigger>
                  <TabsTrigger value="trends">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Trender
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Hantera CSV-data</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-muted-foreground">
                        Hantera dina uppladdade CSV-filer och ladda upp ytterligare månadsdata.
                      </p>
                      <Button onClick={() => setShowUploader(true)}>
                        <UploadCloud className="mr-2 h-4 w-4" />
                        Ladda upp mer data
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="monthly" className="mt-6">
                  <MonthlyComparisonView uploadedPeriods={uploadedPeriods} />
                </TabsContent>

                <TabsContent value="pages" className="mt-6">
                  <PageTimeseriesView uploadedPeriods={uploadedPeriods} />
                </TabsContent>

                <TabsContent value="trends" className="mt-6">
                  <TrendAnalysisView uploadedPeriods={uploadedPeriods} />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-border mt-12">
        <div className="container py-4 text-center text-sm text-muted-foreground">
          <p>Facebook API data analyser © {new Date().getFullYear()}</p>
          <p className="mt-1">
            Tidserie-baserad analys av månadsstatistik | 
            <span className="text-facebook-500 font-medium"> Utvecklad för projektfas 1-8</span>
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;