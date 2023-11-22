// This is a Jsonnet file. Please, check https://jsonnet.org/ for more
// information about the language.
// For the schema, see
// https://github.com/openSUSE/agama/blob/master/rust/agama-lib/share/profile.schema.json

// The "hw.libsonnet" file contains hardware information of the storage devices
// from the "lshw" tool. Agama generates this file at runtime by running (with
// root privileges):
//
//   lshw -json -class disk
//
// However, it is expected to change in the near future to include information
// from other subsystems (e.g., network).
local agama = import 'hw.libsonnet';

// Find the biggest disk which is suitable for installing the system.
local findBiggestDisk(disks) =
  local sizedDisks = std.filter(function(d) std.objectHas(d, 'size'), disks);
  local sorted = std.sort(sizedDisks, function(x) -x.size);
  sorted[0].logicalname;

{
  software: {
    product: 'ALP-Bedrock',
  },
  user: {
    fullName: 'Jane Doe',
    userName: 'jane.doe',
    password: '123456',
  },
  root: {
    password: 'nots3cr3t',
    sshKey: '...',
  },
  // look ma, there are comments!
  localization: {
    language: 'en_US',
    keyboard: 'en_US',
  },
  storage: {
    bootDevice: findBiggestDisk(agama.disks),
  },
  network: {
    connections: [
      {
        id: 'AgamaNetwork',
        wireless: {
          password: 'agama.test',
          security: 'wpa-psk',
          ssid: 'AgamaNetwork'
        }
      },
      {
        id: 'Etherned device 1',
        method4: 'manual',
        gateway4: '192.168.122.1',
        addresses: [
          '192.168.122.100/24,'
        ],
        nameservers: [
          '1.2.3.4'
        ],
        match: {
            path: ["pci-0000:00:19.0"]
          }
      },
      {
        id: 'bond0',
        bond: {
            ports: ['eth0', 'eth1'],
            options: "mode=active-backup primary=eth1"

        }
      }
    ]
  }
}
