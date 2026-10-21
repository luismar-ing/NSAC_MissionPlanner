KPL/MK

PolePlanner meta-kernel (spec 5.1, 6). Kernels listed in data/README.md.
Paths are relative to the repository root: load it with
pipeline.spice_utils.load_kernels(), which runs furnsh from that folder.

\begindata

   PATH_VALUES  = ( 'data/kernels' )
   PATH_SYMBOLS = ( 'K' )

   KERNELS_TO_LOAD = (
      '$K/naif0012.tls'
      '$K/pck00011.tpc'
      '$K/de440s.bsp'
      '$K/moon_pa_de440_200625.bpc'
      '$K/moon_de440_250416.tf'
   )

\begintext
