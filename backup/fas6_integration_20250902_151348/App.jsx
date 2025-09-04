import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from './components/ui/alert';
import { UploadCloud, BarChart3, TrendingUp, Calendar, Info, ArrowLeft } from 'lucide-react';
import TimeseriesUploader from './components/TimeseriesUploader';

function App() {
  const [hasData, setHasData] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [activeTab, setActiveTab] = useState('upload');
  const [uploadedPeriods, setUploadedPeriods] = useState([]);

  // Handler för när data har laddats upp framgångsrikt
  const handleDataUploaded = (periods) => {
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
          <div className="flex items-center justify-between">
            <div className="facebook-brand flex items-center gap-3">
              <BarChart3 className="h-8 w-8" />
              <h1 className="text-2xl font-bold text-foreground">
                Facebook API data analyser
              </h1>
            </div>
            <div className="text-sm text-muted-foreground">
              Tidserie-baserad analys av månadsstatistik
            </div>
          </div>
        </div>
      </header>

      <main className="container py-6">
        <div className="grid gap-6">
          {/* Informationssektion */}
          <Alert variant="info" className="bg-facebook-50 border-facebook-200">
            <Info className="h-4 w-4 text-facebook-600" />
            <AlertTitle className="text-facebook-800">Välkommen till Facebook API data analyser</AlertTitle>
            <AlertDescription className="text-facebook-700">
              <p className="mb-2">
                Detta verktyg analyserar månadsdata från Facebook API i CSV-format. 
                Ladda upp filer som följer namnkonventionen <code className="bg-white px-1 rounded">FB_YYYY_MM.csv</code> 
                (t.ex. FB_2025_08.csv för Augusti 2025).
              </p>
              <p className="font-medium">
                VIKTIGT: Reach och Engaged Users kan aldrig summeras över månader (unika personer per månad).
              </p>
            </AlertDescription>
          </Alert>

          {!hasData ? (
            /* Startskärm - när ingen data är uppladdad */
            <div className="grid gap-6">
              <Card className="timeseries-card">
                <CardHeader className="text-center">
                  <UploadCloud className="h-16 w-16 mx-auto mb-4 text-facebook-500" />
                  <CardTitle className="text-2xl">Börja med att ladda upp CSV-filer</CardTitle>
                  <p className="text-muted-foreground">
                    Ladda upp en eller flera månads-CSV:er för att börja analysera Facebook-data över tid
                  </p>
                </CardHeader>
                <CardContent className="text-center">
                  <Button 
                    variant="facebook" 
                    size="lg" 
                    onClick={() => setShowUploader(true)}
                  >
                    <UploadCloud className="mr-2 h-5 w-5" />
                    Ladda upp CSV-filer
                  </Button>
                </CardContent>
              </Card>

              {/* Förhandsvisning av kommande funktionalitet */}
              <div className="grid md:grid-cols-3 gap-4">
                <Card className="opacity-50">
                  <CardHeader>
                    <Calendar className="h-8 w-8 text-facebook-500 mb-2" />
                    <CardTitle className="text-lg">Månadsanalys</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Analysera prestanda för specifika månader och jämför mellan perioder
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
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-facebook-600">
                        {uploadedPeriods.length}
                      </div>
                      <div className="text-sm text-muted-foreground">Månader</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-facebook-600">
                        {uploadedPeriods.reduce((total, period) => total + (period.pageCount || 0), 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">Totalt sidposter</div>
                    </div>
                    <div className="text-center">
                      <Button 
                        variant="outline" 
                        onClick={() => setShowUploader(true)}
                        className="w-full"
                      >
                        <UploadCloud className="mr-2 h-4 w-4" />
                        Ladda mer data
                      </Button>
                    </div>
                  </div>
                  
                  {uploadedPeriods.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="text-sm font-medium mb-2">Uppladdade perioder:</h4>
                      <div className="flex flex-wrap gap-2">
                        {uploadedPeriods.map((period, index) => (
                          <span 
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-facebook-50 text-facebook-700 border border-facebook-200"
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
                  <Card>
                    <CardHeader>
                      <CardTitle>Månadsanalys</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-4">
                        MonthlyComparisonView implementeras i FAS 6
                      </p>
                      {uploadedPeriods.length > 0 && (
                        <div className="text-sm text-muted-foreground">
                          Tillgängliga månader: {uploadedPeriods.map(p => p.displayName).join(', ')}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="pages" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Sidanalys över tid</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-4">
                        PageTimeseriesView implementeras i FAS 6
                      </p>
                      {uploadedPeriods.length > 0 && (
                        <div className="text-sm text-muted-foreground">
                          Totalt {uploadedPeriods.reduce((total, period) => total + (period.pageCount || 0), 0)} sidposter över {uploadedPeriods.length} månader
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="trends" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Trendanalys</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-4">
                        TrendAnalysisView implementeras i FAS 7
                      </p>
                      {uploadedPeriods.length > 1 && (
                        <div className="text-sm text-muted-foreground">
                          Trendanalys tillgänglig för {uploadedPeriods.length} månader
                        </div>
                      )}
                    </CardContent>
                  </Card>
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